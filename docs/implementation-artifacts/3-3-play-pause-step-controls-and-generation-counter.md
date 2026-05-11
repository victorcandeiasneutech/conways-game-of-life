# Story 3.3: Play/Pause/Step controls and generation counter

Status: review

## Story

As Casey,
I want Play, Pause, and Step buttons plus a visible generation counter,
so that I can run the simulation, freeze it, advance one step at a time, and see how far it has progressed.

## Acceptance Criteria

1. **Given** the simulation is paused,
   **When** the user activates Play,
   **Then** generations begin advancing at the currently configured `genPerSec`, the Play control becomes Pause (or is visually toggled), and the gen counter increments by 1 per advanced generation.

2. **Given** the simulation is running,
   **When** the user activates Pause,
   **Then** advancement stops within one tick, the grid and gen counter are preserved exactly as of the last completed tick, and the control returns to Play.

3. **Given** the simulation is paused,
   **When** the user activates Step,
   **Then** the grid advances by exactly one generation per `step()` from `libs/sim` and the gen counter increments by 1.

4. **Given** the simulation is running,
   **When** the user activates Step,
   **Then** the action is a no-op (Step is visually disabled while running).

5. **Given** the gen counter is rendered,
   **When** the page is at any supported viewport,
   **Then** the counter is visible without scrolling and updates within one frame of each generation advance.

## Tasks / Subtasks

- [x] Import `step` from `@conways-game-of-life/sim` in `page.tsx` (AC: #1, #3)
- [x] Implement `useSimulationLoop` hook in `page.tsx` (AC: #1, #2)
  - [x] Uses `requestAnimationFrame` + time accumulator per architecture §5.2
  - [x] Reads `genPerSec` via `useRef` (fresh every frame, no loop restart on rate change)
  - [x] Reads `step` callback via `useRef` (fresh every frame, stable closure)
  - [x] `useEffect` depends only on `running`
- [x] Add Play/Pause toggle button (AC: #1, #2)
  - [x] Label toggles: "Play" when paused, "Pause" when running
  - [x] `onClick` → `setRunning(r => !r)`
- [x] Add Step button (AC: #3, #4)
  - [x] `disabled` while `running`
  - [x] `onClick` → dispatch `{ type: 'tick', next: step(grid) }` when paused
- [x] Wire `gridRef` to keep a fresh grid reference for the tick callback (AC: #1)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — all green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 3-3 → review

## Dev Notes

### Simulation Loop Hook (architecture §5.2)

Lives in `page.tsx`. Reads both `genPerSec` and the `step` callback through refs so neither triggers a loop restart:

```typescript
function useSimulationLoop(opts: {
  running: boolean;
  genPerSec: number;
  step: () => void;
}) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const genPerSecRef = useRef(opts.genPerSec);
  genPerSecRef.current = opts.genPerSec;
  const stepRef = useRef(opts.step);
  stepRef.current = opts.step;

  useEffect(() => {
    if (!opts.running) return;
    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;
    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accumulatorRef.current += dt;
      const tickInterval = 1000 / genPerSecRef.current;
      while (accumulatorRef.current >= tickInterval) {
        stepRef.current();
        accumulatorRef.current -= tickInterval;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [opts.running]);
}
```

### Tick callback (stable via gridRef)

`handleTick` is stable (empty `useCallback` deps) and reads the latest grid through a ref to avoid stale closure:

```typescript
const gridRef = useRef(grid);
gridRef.current = grid;

const handleTick = useCallback(() => {
  dispatch({ type: 'tick', next: step(gridRef.current) });
}, []);
```

### Step button (AC: #3, #4)

```typescript
function handleStepClick() {
  if (running) return;
  dispatch({ type: 'tick', next: step(grid) });
}
```

### Previous Story Learnings (Story 3.2)

- `baseUrl: "."` in `apps/web/tsconfig.json` — `paths` resolve from apps/web/, matching Turbopack
- `step` and `toggleCell` are imported from `@conways-game-of-life/sim`
- `CELL_PX = 12`, `canvasRef`, `running`, `dispatch` already in `page.tsx`
- `genCount` already incremented via `case 'tick'` in reducer

### References

- [Source: docs/planning-artifacts/architecture.md#5.2] — rAF + accumulator loop pattern, `useSimulationLoop` pseudocode
- [Source: docs/planning-artifacts/epics.md#Story-3.3] — ACs and FR coverage (FR5, FR6, FR7, FR9)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `useSimulationLoop` reads both `genPerSec` and the tick callback through refs (`genPerSecRef`, `stepRef`) so neither can restart the loop — only `opts.running` is a `useEffect` dep.
- `gridRef` pattern keeps `handleTick` a stable `useCallback` (empty deps) while always computing `step()` on the current grid.
- `DEFAULT_GEN_PER_SEC = 10` is a module const; story 3.5 will replace it with slider state.
- Lint passes with one pre-existing warning in `next.config.js` (unused eslint-disable directive); this is not from story 3.3 code.

### File List

- `apps/web/app/page.tsx`
- `docs/implementation-artifacts/3-3-play-pause-step-controls-and-generation-counter.md`
- `docs/implementation-artifacts/sprint-status.yaml`
