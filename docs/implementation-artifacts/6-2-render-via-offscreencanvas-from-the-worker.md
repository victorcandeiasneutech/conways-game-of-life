# Story 6.2: Render via OffscreenCanvas from the worker

Status: review

## Story

As Casey,
I want the worker to render directly to an OffscreenCanvas,
so that the main thread is free for input handling and the perf headroom doubles.

## Acceptance Criteria

1. **Given** `<canvas>.transferControlToOffscreen()` is called once on mount,
   **When** the resulting `OffscreenCanvas` is transferred to the worker,
   **Then** the worker draws the grid each tick using the same `fillRect` strategy as architecture §5.3.

2. **Given** the main thread,
   **When** measured with Chrome DevTools,
   **Then** main-thread CPU during simulation is dominated by event handling (not render), and the README documents the before/after measurement.

## Tasks / Subtasks

- [x] Update `sim.worker.ts` — add `{type: 'init', canvas: OffscreenCanvas, cellPx}` handler: store `OffscreenCanvasRenderingContext2D`, set initial `canvas.width`/`canvas.height` (AC: 1)
- [x] Update `sim.worker.ts` — add `{type: 'render', buffer, width, height}` handler: resize OffscreenCanvas if needed, draw without stepping (AC: 1)
- [x] Update `sim.worker.ts` — tick handler now renders after `step()` instead of main thread; still posts back `{type: 'grid', buffer}` (AC: 1)
- [x] Refactor `page.tsx` — move worker lifecycle (`new Worker(...)`, `terminate`) from `useSimulationLoop` into the Page component; pass `workerRef` to the hook (AC: 1)
- [x] Refactor `page.tsx` — on mount, call `canvasRef.current.transferControlToOffscreen()` and post `{type: 'init', canvas, cellPx: CELL_PX}` to worker (AC: 1)
- [x] Refactor `page.tsx` — remove `useEffect([grid])` canvas render; add `useEffect([grid, running])` that posts `{type: 'render', buffer, width, height}` only when `!running` (AC: 1)
- [x] Update `useSimulationLoop` signature — accept `workerRef: { current: Worker | null }` instead of creating the worker internally (AC: 2)
- [x] Update `apps/web/jest.setup.ts` — mock `HTMLCanvasElement.prototype.transferControlToOffscreen` returning a minimal `OffscreenCanvas`-shaped stub (AC: 1)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1, 2)
- [x] README: add before/after main-thread CPU measurement note alongside NFR5 (AC: 2)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 6-2 → review

## Dev Notes

### Architecture §5.3 — The upgrade path, step 3

Architecture §5.3 documents the full OffscreenCanvas upgrade:

> 3. (Optionally) replace `<canvas>` with `<canvas>` + `transferControlToOffscreen()` so the worker draws directly. Main thread does only event handling + slider state.

This story is step 3. Step 1+2 (worker + transferable buffers) landed in story 6.1.

### Thread split after this story

| Concern | Thread |
|---|---|
| `step()` computation | worker |
| Canvas rendering (`fillRect`) | worker |
| rAF + accumulator loop | main |
| Event handling (pointer, slider, buttons) | main |
| React state (grid, genCount, running, genPerSec) | main |

Main thread never touches `CanvasRenderingContext2D` again after mount.

### `transferControlToOffscreen()` — usage and constraints

```typescript
// In Page useEffect ([], []):
const canvas = canvasRef.current!;
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage(
  { type: 'init', canvas: offscreen, cellPx: CELL_PX },
  [offscreen],        // offscreen is Transferable
);
```

**After transfer:**
- Main thread: `canvas.getContext('2d')` throws — do NOT call it.
- Main thread: `canvas.width` / `canvas.height` DOM attributes still readable — React can still set them for layout.
- Worker: owns the `OffscreenCanvas`; its `width`/`height` must be updated manually on grid resize.
- `transferControlToOffscreen()` can only be called once per canvas element. It must be called before any `getContext` call on the element. Since `page.tsx` previously had `useEffect([grid])` calling `getContext`, that effect must be removed before the transfer is attempted.

Browser support: Chrome 69+, Firefox 105+, Safari 16.4+ — all modern evergreen browsers (NFR2). ✓

### Worker message protocol after this story

```typescript
// Init (main → worker, once on mount)
{ type: 'init'; canvas: OffscreenCanvas; cellPx: number }

// Tick (main → worker, each rAF step)
{ type: 'tick'; buffer: ArrayBuffer; width: number; height: number }

// Grid response (worker → main, after each tick)
{ type: 'grid'; buffer: ArrayBuffer; width: number; height: number }

// Render without step (main → worker, when paused + grid changes)
{ type: 'render'; buffer: ArrayBuffer; width: number; height: number }
```

### Updated `sim.worker.ts` shape

```typescript
import { step } from '@conways-game-of-life/sim';

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let storedCanvas: OffscreenCanvas | null = null;
let cellPx = 12;

function renderGrid(cells: Uint8Array, width: number, height: number) {
  if (!ctx || !storedCanvas) return;
  if (storedCanvas.width !== width * cellPx) storedCanvas.width = width * cellPx;
  if (storedCanvas.height !== height * cellPx) storedCanvas.height = height * cellPx;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width * cellPx, height * cellPx);
  ctx.fillStyle = '#22d3ee';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x] === 1) {
        ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      }
    }
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type } = e.data;
  if (type === 'init') {
    storedCanvas = e.data.canvas as OffscreenCanvas;
    cellPx = e.data.cellPx as number;
    ctx = storedCanvas.getContext('2d');
  } else if (type === 'tick') {
    const { buffer, width, height } = e.data as { buffer: ArrayBuffer; width: number; height: number };
    const next = step({ width, height, cells: new Uint8Array(buffer) });
    renderGrid(next.cells, next.width, next.height);
    self.postMessage(
      { type: 'grid', buffer: next.cells.buffer, width: next.width, height: next.height },
      [next.cells.buffer],
    );
  } else if (type === 'render') {
    const { buffer, width, height } = e.data as { buffer: ArrayBuffer; width: number; height: number };
    renderGrid(new Uint8Array(buffer), width, height);
  }
};
```

### Refactored worker lifecycle in `page.tsx`

Move worker creation from `useSimulationLoop` to the Page component so the page can also send `{type: 'init'}` and `{type: 'render'}` messages directly:

```typescript
// In Page component:
const workerRef = useRef<Worker | null>(null);

// Effect 1: worker lifecycle + canvas transfer (runs once on mount)
useEffect(() => {
  const worker = new Worker(new URL('./workers/sim.worker.ts', import.meta.url));
  workerRef.current = worker;

  const canvas = canvasRef.current;
  if (canvas) {
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'init', canvas: offscreen, cellPx: CELL_PX }, [offscreen]);
  }

  return () => {
    worker.terminate();
    workerRef.current = null;
  };
}, []);

// Effect 2: non-tick renders — send to worker when paused + grid changes
useEffect(() => {
  if (running) return;
  const worker = workerRef.current;
  if (!worker) return;
  const buffer = grid.cells.buffer.slice(0);
  worker.postMessage({ type: 'render', buffer, width: grid.width, height: grid.height }, [buffer]);
}, [grid, running]);

// Hook call — pass workerRef instead of creating worker inside
useSimulationLoop({ running, genPerSec, gridRef, onGrid: handleGrid, workerRef });
```

**Remove** the old `useEffect([grid])` that called `canvas.getContext('2d')` — that code is dead after the transfer.

### Updated `useSimulationLoop` signature

```typescript
function useSimulationLoop(opts: {
  running: boolean;
  genPerSec: number;
  gridRef: { current: Grid };
  onGrid: (next: Grid) => void;
  workerRef: { current: Worker | null }; // externally owned, passed in
}) { ... }
```

Remove the internal `useEffect([], [])` that created the worker. The hook no longer manages worker lifecycle — it only manages the rAF loop and tick posting.

### Jest mock for `transferControlToOffscreen`

jsdom does not implement `HTMLCanvasElement.prototype.transferControlToOffscreen`. Add to `jest.setup.ts`:

```typescript
// Minimal OffscreenCanvas stub for jsdom
class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) { this.width = w; this.height = h; }
  getContext() { return null; }
}

HTMLCanvasElement.prototype.transferControlToOffscreen = function () {
  return new MockOffscreenCanvas(this.width, this.height) as unknown as OffscreenCanvas;
};
```

This prevents the `TypeError: canvas.transferControlToOffscreen is not a function` that would otherwise fail the mount effect in Jest tests.

### `canvasRef` after transfer — layout vs render

After `transferControlToOffscreen()`, React can still set `width` and `height` attributes on the `<canvas>` DOM element — these control the element's layout size. The worker manages the OffscreenCanvas's rendering dimensions separately (updating `storedCanvas.width`/`height` in `renderGrid` when they differ). The `<canvas>` element still receives pointer events normally (`onPointerDown` still fires) — cell toggle hit-testing remains intact.

### Initial render on mount

The first render happens when the user interacts (toggle, randomize, play). On a fresh load, the grid is all-dead (all-black), which is the same as the canvas's default state. No explicit `{type: 'render'}` message is needed on mount.

If needed, add an initial render message after `{type: 'init'}` completes — but guard with `worker.onmessage` to sequence after init:

```typescript
// Simple alternative: send initial render after posting init
const buffer = grid.cells.buffer.slice(0);
worker.postMessage({ type: 'render', buffer, width: grid.width, height: grid.height }, [buffer]);
```

(Keep if the canvas shows as transparent on first load; skip if default black is acceptable.)

### Performance measurement methodology (README)

AC 2 requires before/after measurement. Suggested approach:
- **Before (story 6.1 baseline):** Chrome DevTools Performance → record 5s at 200×200/30 gen/sec → inspect Main thread frames and the `useEffect` render calls in the flame chart. Each frame shows both a `step()` call (in worker via postMessage) and a `fillRect` block (in the Main thread's `useEffect` callback).
- **After (story 6.2):** Same recording → Main thread flame chart shows only the rAF accumulator loop and `postMessage` calls. All `fillRect` work appears in the Worker thread only.

### Files to create/modify

- `apps/web/app/workers/sim.worker.ts` — MODIFIED (add init/render handlers, move fillRect here)
- `apps/web/app/page.tsx` — MODIFIED (worker lifecycle + canvas transfer + non-tick renders)
- `apps/web/jest.setup.ts` — MODIFIED (add transferControlToOffscreen mock)
- `README.md` — MODIFIED (before/after main-thread measurement)
- `docs/implementation-artifacts/6-2-render-via-offscreencanvas-from-the-worker.md` — NEW (this file)
- `docs/implementation-artifacts/sprint-status.yaml` — MODIFIED (6-2 → review)

### Project Structure Notes

- Worker still lives at `apps/web/app/workers/sim.worker.ts` — same file, extended
- No new packages, no new libs — this is a pure wiring change
- `tsconfig.worker.json` already has `lib: ["webworker"]` — `OffscreenCanvas`, `OffscreenCanvasRenderingContext2D` are already typed ✓
- Module boundary: `scope:app` → `scope:sim` is already permitted ✓
- `apps/web/project.json` custom typecheck target already has `dependsOn: ["^typecheck"]` ✓

### References

- [Source: docs/planning-artifacts/architecture.md#5.3] — Render strategy upgrade path (canonical)
- [Source: docs/planning-artifacts/architecture.md#7.6] — NFR5 performance measurement methodology
- [Source: docs/planning-artifacts/epics.md#Story-6.2] — ACs and effort estimate
- [Source: apps/web/app/workers/sim.worker.ts] — current tick handler to extend
- [Source: apps/web/app/page.tsx] — useSimulationLoop hook, canvasRef, useEffect([grid]) to remove

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Worker now handles three message types: `init` (receives `OffscreenCanvas`, stores context), `tick` (step + render + post back buffer), `render` (draw without step — used when paused).
- Worker lifecycle moved from `useSimulationLoop` into the Page component so the page can send `init` and `render` messages directly; the hook receives `workerRef` as a prop and wires `onmessage` via a `useEffect([opts.workerRef])`.
- `transferControlToOffscreen()` is called in the mount effect, sequenced after the worker is stored in `workerRef.current`; the `OffscreenCanvas` is posted as a transferable in the `init` message.
- `useEffect([grid])` canvas render removed; replaced by `useEffect([grid, running])` that posts `{type: 'render'}` only when `!running` — during simulation the worker renders automatically after each tick.
- `OffscreenCanvas` dimensions updated in `renderGrid` whenever they diverge from `width * cellPx` / `height * cellPx` — handles grid resizes without a separate resize message.
- `HTMLCanvasElement.prototype.transferControlToOffscreen` mocked in `jest.setup.ts` returning a `MockOffscreenCanvas` stub; existing render tests continue to pass (mock worker never fires, running defaults false, no render messages sent during tests).
- IDE shows false TS errors on `self.postMessage([...])` in worker — these are from the dom lib since the file is excluded from the main tsconfig. `pnpm nx typecheck web` compiles with `tsconfig.worker.json` (`lib: ["webworker"]`) and is clean.

### File List

- `apps/web/app/workers/sim.worker.ts`
- `apps/web/app/page.tsx`
- `apps/web/jest.setup.ts`
- `README.md`
- `docs/implementation-artifacts/6-1-move-step-into-a-web-worker-with-transferable-grid-buffers.md`
- `docs/implementation-artifacts/6-2-render-via-offscreencanvas-from-the-worker.md`
- `docs/implementation-artifacts/sprint-status.yaml`
