# Story 3.2: Canvas render and click/tap-to-toggle cells

Status: in-progress

## Story

As Casey,
I want to click (or tap) a cell on the canvas to toggle it alive/dead before pressing play,
so that I can paint a starting state I'm interested in.

## Acceptance Criteria

1. **Given** the simulation is paused and the canvas has rendered the current grid,
   **When** the user clicks a dead cell (mouse) or taps it (touch),
   **Then** the cell becomes alive, is visibly distinguishable from dead cells (cyan `#22d3ee` on
   near-black `#0a0a0a` background per architecture §7.5), and the state change appears within
   50ms of the input event.

2. **Given** the simulation is paused,
   **When** the user clicks an alive cell,
   **Then** the cell becomes dead.

3. **Given** the simulation is running,
   **When** the user clicks the canvas,
   **Then** the toggle is a no-op (clicks ignored while running, per FR2).

4. **Given** the rendering implementation,
   **When** the grid state changes,
   **Then** a `useEffect([grid])` triggers a full canvas redraw using `fillRect` per architecture §5.3
   (no DOM-per-cell rendering).

5. **Given** the click→grid-coordinate conversion,
   **When** the canvas is scaled by CSS to fit its container,
   **Then** `getBoundingClientRect()` is used so coordinates remain accurate at any rendered size.

## Tasks / Subtasks

- [ ] Implement `renderGrid` in `apps/web/app/page.tsx` (AC: #4)
  - [ ] Add `useEffect([grid])` hook that calls `renderGrid(ctx, grid, CELL_PX)` via `canvasRef`
  - [ ] `renderGrid`: fill background `#0a0a0a`, then fill alive cells `#22d3ee`
- [ ] Wire `onPointerDown` on `<canvas>` for cell toggle (AC: #1, #2, #3, #5)
  - [ ] Handler: when running → return early (no-op); when paused → compute grid coords and dispatch `toggleCell`
  - [ ] Coord conversion: `getBoundingClientRect()` + `scaleX/Y = grid.width / rect.width`
  - [ ] Dispatch new `{ type: 'toggle'; x: number; y: number }` action to reducer
- [ ] Add `toggle` case to reducer in `page.tsx` (AC: #1, #2)
  - [ ] `case 'toggle': return { ...state, grid: toggleCell(state.grid, action.x, action.y) }`
- [ ] Import `toggleCell` from `@conways-game-of-life/sim` in `page.tsx`
- [ ] Update `apps/web/specs/index.spec.tsx` — add test for canvas presence
- [ ] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — all green
- [ ] Update `docs/implementation-artifacts/sprint-status.yaml` — 3-2 → review

## Dev Notes

### Canvas Render (architecture §5.3)

The render function lives directly in `page.tsx` (no separate Canvas component needed at this story).
Trigger via `useEffect` watching `grid`:

```typescript
const CELL_PX = 12;

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, grid.width * CELL_PX, grid.height * CELL_PX);
  ctx.fillStyle = '#22d3ee';
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y * grid.width + x] === 1) {
        ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
      }
    }
  }
}, [grid]);
```

### Reducer Update

Add a `toggle` action to the existing reducer:

```typescript
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid }
  | { type: 'toggle'; x: number; y: number };

// in reducer:
case 'toggle':
  return { ...state, grid: toggleCell(state.grid, action.x, action.y) };
```

### Click Handler (AC: #3, #5)

```typescript
function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
  if (running) return; // no-op while running
  const rect = e.currentTarget.getBoundingClientRect();
  const scaleX = grid.width / rect.width;
  const scaleY = grid.height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  dispatch({ type: 'toggle', x, y });
}
```

Add to `<canvas>`:
```tsx
<canvas
  ref={canvasRef}
  width={grid.width * CELL_PX}
  height={grid.height * CELL_PX}
  className="max-w-full cursor-crosshair"
  style={{ background: '#0a0a0a' }}
  onPointerDown={handleCanvasPointerDown}
/>
```

### Previous Story Learnings (Story 3.1)

- `baseUrl: "."` is set in `apps/web/tsconfig.json` — `paths` for libs use `../../libs/...` prefix (relative to apps/web/, not workspace root)
- `toggleCell` is imported from `@conways-game-of-life/sim` (already available in the lib's public API)
- `CELL_PX = 12` is a local constant in `page.tsx`
- `canvasRef` already exists in `page.tsx` from story 3.1

### References

- [Source: docs/planning-artifacts/architecture.md#5.3] — Canvas render strategy + `renderGrid` pseudocode
- [Source: docs/planning-artifacts/architecture.md#7.5] — Colors: `#22d3ee` alive, `#0a0a0a` dead
- [Source: docs/planning-artifacts/epics.md#Story-3.2] — ACs and user persona (Casey)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
