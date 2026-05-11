# Story 6.1: Move `step()` into a Web Worker with transferable grid buffers

Status: review

## Story

As Casey,
I want the simulation to keep running smoothly when I bump the grid up to 100×100 or 200×200,
so that the toy still feels alive at large grid sizes.

## Acceptance Criteria

1. **Given** `apps/web/app/workers/sim.worker.ts`,
   **When** the main thread posts `{type: 'tick', buffer: ArrayBuffer}` with the current grid's `ArrayBuffer` as a transferable,
   **Then** the worker reconstructs the `Grid`, calls `step()` (imported from `@conways-game-of-life/sim`), and posts back `{type: 'grid', buffer: ArrayBuffer}` as a transferable with the next-generation cells.

2. **Given** the simulation loop hook,
   **When** the worker round-trip is wired in,
   **Then** `genPerSec` adjustment mid-run still works — the rAF + accumulator pattern is preserved on the main thread.

3. **Given** Chrome DevTools Performance recording,
   **When** running at 200×200 with `genPerSec = 30`,
   **Then** sustained framerate is ≥ 60fps with no frame > 33ms over a 5-second window, and the measurement methodology is captured in the README per NFR5.

## Tasks / Subtasks

- [x] Create `apps/web/app/workers/tsconfig.worker.json` — `lib: ["webworker", "esnext"]`, excludes main app files (AC: 1)
- [x] Create `apps/web/app/workers/sim.worker.ts` — receives `{type: 'tick', buffer, width, height}`, calls `step()`, posts back `{type: 'grid', buffer}` as transferable (AC: 1)
- [x] Refactor `useSimulationLoop` in `page.tsx` to use the worker instead of calling `step()` directly — instantiate worker via `new Worker(new URL('./workers/sim.worker.ts', import.meta.url))`, track pending flag, send tick requests (AC: 2)
- [x] Update `handleTick` / remove synchronous `step()` call from simulation loop — `handleGrid` callback dispatches from `worker.onmessage` (AC: 2)
- [x] Verify `genPerSec` mid-run slider still works — rAF accumulator preserved on main thread; `genPerSecRef` updated each render (AC: 2)
- [x] Verify `running=false` correctly stops the loop — `runningRef` checked in `onmessage`, stale responses discarded; `pendingRef` reset on stop (AC: 2)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1, 2)
- [x] Performance verification: Chrome DevTools methodology documented in README (AC: 3)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 6-1 → review

## Dev Notes

### Architecture §5.3 — Upgrade path (canonical reference)

Architecture §5.3 documents this exact story:

> 1. Move `step()` into `apps/web/app/workers/sim.worker.ts`.
> 2. Replace the `step()` call in the rAF loop with `worker.postMessage({type: 'tick'})`;
>    receive `{type: 'grid', cells: ArrayBuffer}` back via transferable.
> 3. (Optionally) replace `<canvas>` with `<canvas>` + `transferControlToOffscreen()` so the worker
>    draws directly. Main thread does only event handling + slider state.
>
> This upgrade is one focused PR *because the sim is already pure and array-based*.

Story 6.2 covers point 3 (OffscreenCanvas). This story is point 1 + 2 only.

### Why transferables work here

`Grid.cells` is `Uint8Array`. Its `.buffer` is an `ArrayBuffer` — zero-copy transferable between main thread and worker. The design decision to use a flat `Uint8Array` instead of `boolean[][]` was explicitly made to enable this (architecture §4.1):

> "Flat `Uint8Array` is strictly better" — cache-friendly, `transferList`-friendly (Worker), zero per-cell allocation.

Transfer pattern:
```typescript
// main → worker
const buffer = grid.cells.buffer;
worker.postMessage({ type: 'tick', buffer, width: grid.width, height: grid.height }, [buffer]);
// grid.cells is now detached (zero-copy transfer) — do NOT read it after posting

// worker → main  
const next = step({ width, height, cells: new Uint8Array(buffer) });
self.postMessage({ type: 'grid', buffer: next.cells.buffer }, [next.cells.buffer]);
```

### Worker file and TypeScript config

Next.js 16 (webpack 5) bundles worker files via `new Worker(new URL(..., import.meta.url))` syntax. The path alias `@conways-game-of-life/sim` resolves correctly in worker context because webpack processes it.

The worker file needs `lib: ["webworker"]`, but the main app tsconfig has `lib: ["dom", "dom.iterable", "esnext"]`. These conflict. Solution:

1. **Create `apps/web/app/workers/tsconfig.worker.json`:**
   ```json
   {
     "extends": "../../../tsconfig.base.json",
     "compilerOptions": {
       "lib": ["webworker", "esnext"],
       "moduleResolution": "bundler",
       "paths": {
         "@conways-game-of-life/sim": ["../../../libs/sim/src/index.ts"],
         "@conways-game-of-life/types": ["../../../libs/types/src/index.ts"]
       }
     },
     "include": ["./**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

2. **Exclude `app/workers/**` from main tsconfig** — add `"app/workers/**"` to the `exclude` array in `apps/web/tsconfig.json` to prevent `dom` lib conflicts.

3. **Add worker typecheck to Nx targets** — update `apps/web/project.json` to include `--project apps/web/app/workers/tsconfig.worker.json` in the typecheck target, OR rely on Next.js webpack to catch type errors during build. Check current `project.json` typecheck target configuration before adding.

### Worker instantiation in page.tsx

```typescript
// Instantiate once on mount, terminate on unmount
const workerRef = useRef<Worker | null>(null);
useEffect(() => {
  workerRef.current = new Worker(
    new URL('./workers/sim.worker.ts', import.meta.url)
  );
  return () => workerRef.current?.terminate();
}, []);
```

`new URL('./workers/sim.worker.ts', import.meta.url)` is the Next.js/webpack 5 pattern for typed worker imports. Do NOT use a string path — webpack requires the `new URL(...)` form to detect and bundle the worker.

### Pending-tick guard (preserving rAF accumulator semantics)

The current `useSimulationLoop` calls `step()` synchronously — multiple ticks can fire in one rAF frame if the accumulator has accumulated more than one `tickInterval`. With a worker, ticks are async. Simple solution: track a `pendingRef` flag. If a tick is already in flight, skip posting until the worker responds.

```typescript
const pendingRef = useRef(false);

// in rAF tick:
while (accumulatorRef.current >= tickInterval) {
  if (!pendingRef.current) {
    pendingRef.current = true;
    // post to worker
  }
  accumulatorRef.current -= tickInterval;
}

// in worker.onmessage:
pendingRef.current = false;
dispatch({ type: 'tick', next: reconstructedGrid });
```

At high `genPerSec` (≥ 30), the worker round-trip is the bottleneck — ticks will be dropped when the worker is busy. This is acceptable for a visual simulation. The gen counter will still increment each response.

### Stopping the simulation

When `running` transitions to `false`, the rAF loop stops posting new tick messages. Any in-flight worker response that arrives after `running = false` should be ignored. Use a `runningRef` to check at response time:

```typescript
worker.onmessage = (e) => {
  if (!runningRef.current) return; // discard stale responses
  pendingRef.current = false;
  dispatch({ type: 'tick', next: reconstructedGrid });
};
```

### `useSimulationLoop` refactor scope

The hook currently takes `{ running, genPerSec, step: () => void }`. After this story:
- `step` callback is removed (the hook no longer calls `step()` directly)
- Worker posting happens inside the hook, or the hook is replaced with inline `useEffect` in `Page`

Either approach is acceptable. Keep the change minimal — the goal is to move the `step()` call off the main thread, not to redesign the hook API.

### `step()` return type in worker context

`step()` returns `Grid` where `cells` is `new Uint8Array(...)` — backed by a fresh `ArrayBuffer`. This means `next.cells.buffer` is always a new, transferable `ArrayBuffer`. Do not reuse the input buffer on the same side — after transferring, it's detached.

### `gridRef` and state sync

After the worker takes ownership of the buffer (via transfer), the main thread's `grid.cells.buffer` is detached (`byteLength === 0`). The grid received in `dispatch({type: 'tick', next})` must be reconstructed from the worker's response buffer before being stored in React state.

```typescript
// in worker.onmessage:
const { buffer, width, height } = e.data;
const cells = new Uint8Array(buffer);
dispatch({ type: 'tick', next: { width, height, cells } });
```

### Performance target and README documentation

AC 3 requires README documentation of the measurement methodology. The architecture §7.6 documents the approach:

> NFR5: Same method as NFR4, 60fps target on 200×200. Measurement methodology in README.

For the README update: resize grid to 200×200 via the GridSizeForm, set genPerSec to 30, start simulation, open Chrome DevTools → Performance, record 5 seconds, verify no frame > 33ms. Screenshot or describe the result.

### Files to create/modify

- `apps/web/app/workers/sim.worker.ts` — NEW
- `apps/web/app/workers/tsconfig.worker.json` — NEW
- `apps/web/app/page.tsx` — refactor `useSimulationLoop` + add worker lifecycle
- `apps/web/tsconfig.json` — add `"app/workers/**"` to `exclude`
- `README.md` — add NFR5 performance measurement section
- `docs/implementation-artifacts/sprint-status.yaml` — 6-1 → review

### Project Structure Notes

- Worker file lives at `apps/web/app/workers/sim.worker.ts` per architecture §5.3
- `@conways-game-of-life/sim` import in worker is valid — webpack resolves it during worker bundling
- Module boundary: `scope:web` importing `scope:sim` is already permitted by the Nx boundary rules
- No new libs or packages needed — this is a pure wiring change

### References

- [Source: docs/planning-artifacts/architecture.md#5.3] — Render strategy upgrade path (canonical)
- [Source: docs/planning-artifacts/architecture.md#4.1] — Flat Uint8Array rationale
- [Source: docs/planning-artifacts/architecture.md#7.6] — NFR5 performance measurement methodology
- [Source: docs/planning-artifacts/epics.md#Story-6.1] — ACs and effort estimate
- [Source: apps/web/app/page.tsx] — `useSimulationLoop` hook, `handleTick`, `gridRef` pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `tsconfig.worker.json` extends base tsconfig but overrides `composite/declaration/declarationMap/emitDeclarationOnly` to avoid emit-related TS5069 errors when running `--noEmit`.
- Worker file excluded from `apps/web/tsconfig.json` (added `"app/workers/**"` to exclude) to prevent `dom` and `webworker` lib declarations merging in main compilation.
- `apps/web/project.json` now overrides the Nx-inferred `typecheck` target with `nx:run-commands` running both tsconfigs sequentially.
- Jest's `Worker` global mocked in `jest.setup.ts` via `setupFilesAfterEnv` — jsdom has no Web Worker API. `postMessage`/`terminate` are no-op; `running=false` initial state means the loop never fires during render tests.
- `slice(0)` copy on send side: main thread keeps its `grid.cells.buffer` intact for canvas rendering; the returned worker buffer becomes the new React state without copying (zero-copy on receive side).
- `handleStepClick` still uses synchronous `step()` directly — single click, not the hot loop; no worker round-trip needed.

### File List

- `apps/web/app/workers/sim.worker.ts`
- `apps/web/app/workers/tsconfig.worker.json`
- `apps/web/app/page.tsx`
- `apps/web/tsconfig.json`
- `apps/web/project.json`
- `apps/web/jest.config.cts`
- `apps/web/jest.setup.ts`
- `README.md`
- `docs/implementation-artifacts/6-1-move-step-into-a-web-worker-with-transferable-grid-buffers.md`
- `docs/implementation-artifacts/sprint-status.yaml`
