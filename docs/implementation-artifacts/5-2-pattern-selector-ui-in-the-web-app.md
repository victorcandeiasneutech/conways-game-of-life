# Story 5.2: Pattern selector UI in the web app

Status: review

## Story

As Casey,
I want a pattern dropdown in the web app,
so that I can pick a glider or Gosper gun and see it placed on the grid.

## Acceptance Criteria

1. **Given** the patterns are exported from `libs/sim`,
   **When** the user opens the pattern selector,
   **Then** the available named patterns are listed with their human-readable names.

2. **Given** the user selects a pattern that fits the current grid,
   **When** the user clicks Place,
   **Then** the pattern is placed centered on the grid and the gen counter resets to 0.

3. **Given** the user selects a pattern that does NOT fit the current grid,
   **When** the user clicks Place,
   **Then** the app auto-resizes the grid to `max(current.width, pattern.width) × max(current.height, pattern.height)`, places the pattern centered, and resets the gen counter to 0.

## Tasks / Subtasks

- [x] Add `| { type: 'place'; grid: Grid }` action to reducer (`apps/web/app/page.tsx`)
- [x] Add `buildPlacedGrid(current, pattern)` helper — computes auto-resize + centered anchor
- [x] Add `selectedPatternId` state (`useState<string>(PATTERNS[0].id)`)
- [x] Add `handlePlacePattern()` — stops simulation, dispatches `place` action
- [x] Add Pattern selector to sidebar JSX — `<select id="pattern-select">` + Place button
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 5-1 → done, 5-2 → review

## Dev Notes

### Reducer action design

The `place` action carries a pre-computed `Grid` rather than the pattern + anchor. Computation (auto-resize, centering) happens in `buildPlacedGrid()` in the event handler — the reducer stays a pure state updater with no imports from `libs/sim`.

### Auto-resize and centering

```typescript
function buildPlacedGrid(current: Grid, pattern: NamedPattern): Grid {
  const w = Math.max(current.width, pattern.width);
  const h = Math.max(current.height, pattern.height);
  const base = createGrid(w, h);          // fresh grid — no prior cells
  const anchorX = Math.floor((w - pattern.width) / 2);
  const anchorY = Math.floor((h - pattern.height) / 2);
  return placePattern(base, pattern, anchorX, anchorY);
}
```

`createGrid` gives a blank canvas even when auto-resizing — no carry-over cells.

### Why `<select>` not buttons

Four patterns fit cleanly in a dropdown. Button-per-pattern would require a wider sidebar at mobile widths. The `<select>` has a `htmlFor` label association so screen readers announce it correctly.

### References

- [Source: docs/planning-artifacts/epics.md#Story-5.2] — ACs
- [Source: docs/implementation-artifacts/5-1-pattern-data-and-placepattern-in-libs-sim.md] — PATTERNS array, placePattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `buildPlacedGrid` is a pure module-level function, not a hook or component method — easy to test in isolation if needed.
- Gosper Glider Gun (36×9) on a 30×30 grid auto-resizes to 36×30 on Place.
- Running simulation is stopped before placing — consistent with Clear, Randomize, and Resize.

### File List

- `apps/web/app/page.tsx`
- `docs/implementation-artifacts/5-2-pattern-selector-ui-in-the-web-app.md`
- `docs/implementation-artifacts/sprint-status.yaml`
