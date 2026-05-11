# Story 3.4: Clear and Randomize controls

Status: review

## Story

As Casey,
I want one-click Clear and Randomize buttons,
so that I can reset to empty or jump to an interesting random starting state without painting cell-by-cell.

## Acceptance Criteria

1. **Given** any grid state and either running or paused,
   **When** the user activates Clear,
   **Then** every cell is dead, the gen counter resets to 0, and if the simulation was running it is now paused.

2. **Given** any grid state and either running or paused,
   **When** the user activates Randomize,
   **Then** `randomizeGrid` from `libs/sim` is called with the default density (0.3), the gen counter resets to 0, and if the simulation was running it is now paused.

3. **Given** the controls are rendered,
   **When** the page is at any supported viewport,
   **Then** both buttons are reachable and operable via mouse, touch, or keyboard (Tab + Enter/Space).

## Tasks / Subtasks

- [x] Import `clearGrid` and `randomizeGrid` from `@conways-game-of-life/sim` in `page.tsx`
- [x] Add `clear` and `randomize` action cases to reducer (AC: #1, #2)
  - [x] `case 'clear': return { grid: clearGrid(state.grid), genCount: 0 }`
  - [x] `case 'randomize': return { grid: randomizeGrid(state.grid), genCount: 0 }`
- [x] Add `handleClear` and `handleRandomize` handlers (AC: #1, #2)
  - [x] Both stop the simulation (`setRunning(false)`) then dispatch their action
- [x] Add Clear and Randomize buttons to JSX alongside Play/Pause and Step (AC: #3)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — all green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 3-4 → review

## Dev Notes

### Reducer additions

```typescript
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid }
  | { type: 'toggle'; x: number; y: number }
  | { type: 'clear' }
  | { type: 'randomize' };

// in reducer:
case 'clear':
  return { grid: clearGrid(state.grid), genCount: 0 };
case 'randomize':
  return { grid: randomizeGrid(state.grid), genCount: 0 };
```

### Handlers

```typescript
function handleClear() {
  setRunning(false);
  dispatch({ type: 'clear' });
}

function handleRandomize() {
  setRunning(false);
  dispatch({ type: 'randomize' });
}
```

### Previous Story Learnings (Story 3.3)

- `clearGrid` and `randomizeGrid` are already exported from `@conways-game-of-life/sim`
- `setRunning` is stable; calling it before dispatch is fine (React batches state updates)
- Buttons should follow the same styling convention as Step (`bg-neutral-700`)

### References

- [Source: docs/planning-artifacts/epics.md#Story-3.4] — ACs and FR coverage (FR3, FR4)
- [Source: libs/sim/src/lib/grid.ts] — `clearGrid` and `randomizeGrid` signatures

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `clearGrid` and `randomizeGrid` were already in `libs/sim` from story 2.1/2.4 — no lib changes needed.
- Both handlers call `setRunning(false)` before dispatch; React batches these, so the loop cancels before the new grid renders.
- Clear and Randomize are in a separate `flex gap-2` row below Play/Step for visual grouping.

### File List

- `apps/web/app/page.tsx`
- `docs/implementation-artifacts/3-4-clear-and-randomize-controls.md`
- `docs/implementation-artifacts/sprint-status.yaml`
