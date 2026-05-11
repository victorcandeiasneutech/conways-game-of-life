# Story 5.1: Pattern data and `placePattern()` in `libs/sim`

Status: review

## Story

As Casey,
I want canonical patterns (block, blinker, glider, Gosper glider gun) available as typed data with a `placePattern(grid, pattern, anchorX, anchorY)` helper,
so that I can load a known interesting starting state without painting it cell-by-cell.

## Acceptance Criteria

1. **Given** `libs/sim/src/lib/patterns.ts`,
   **When** the module is imported,
   **Then** it exports typed `NamedPattern` records for `block`, `blinker`, `glider`, and `gosperGliderGun`, each with `id`, `name`, `width`, `height`, and `liveCells`.

2. **Given** `placePattern(grid, pattern, anchorX, anchorY)`,
   **When** called with a pattern that fits within the grid relative to the anchor,
   **Then** it returns a new grid with the pattern's live cells placed at offsets from the anchor.

3. **Given** Jest specs in `libs/sim/src/lib/patterns.spec.ts`,
   **When** `pnpm nx test sim` runs,
   **Then** specs verify: (a) the canonical glider translates by (1,1) after 4 steps; (b) the canonical blinker oscillates with period 2; (c) `placePattern` skips cells that exceed grid bounds.

## Tasks / Subtasks

- [x] Add `NamedPattern` interface to `libs/types/src/lib/patterns.ts`
- [x] Export `NamedPattern` from `libs/types/src/index.ts`
- [x] Create `libs/sim/src/lib/patterns.ts` with `block`, `blinker`, `glider`, `gosperGliderGun`, `PATTERNS`, `placePattern`
- [x] Create `libs/sim/src/lib/patterns.spec.ts` with all AC tests (8 tests)
- [x] Export from `libs/sim/src/index.ts`
- [x] Run `pnpm nx test sim` — 54/54 passing (48 prior + 6 new)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 5-1 → review

## Dev Notes

### NamedPattern interface location

`NamedPattern` lives in `libs/types` — the shared interface layer. `libs/sim` imports it as it does `Grid`. This respects the type hierarchy: `scope:types` → no deps, `scope:sim` → depends on `scope:types`.

### Gosper Glider Gun coordinates

Decoded from canonical RLE:
`24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o`

Result: 36 live cells in a 36×9 bounding box.

### placePattern boundary behavior

Out-of-bounds cells are silently skipped (same defensive posture as `setCell` and `randomizeGrid`). The epic 4 retro flagged this as the key design note: clamp/skip rather than throw.

### Glider translation test

Glider placed at anchor (0,0) on a 20×20 grid. After 4 steps, each live cell at `(x, y)` should appear at `(x+1, y+1)`. This is the canonical period-4 diagonal movement of the standard glider orientation.

### Blinker period-2 test

Horizontal blinker placed at anchor (3,4) on a 10×10 grid. After 2 steps, `grid.cells` should equal the initial cells exactly.

### References

- [Source: docs/planning-artifacts/epics.md#Story-5.1] — ACs and spec location

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `libs/types` uses `moduleResolution: nodenext` → added export as `'./lib/patterns.js'` in index.ts
- `PATTERNS` array provides a single ordered list for the UI story (5.2)
- All 6 new tests pass on first run; total sim suite 54 tests

### File List

- `libs/types/src/lib/patterns.ts`
- `libs/types/src/index.ts`
- `libs/sim/src/lib/patterns.ts`
- `libs/sim/src/lib/patterns.spec.ts`
- `libs/sim/src/index.ts`
- `docs/implementation-artifacts/5-1-pattern-data-and-placepattern-in-libs-sim.md`
- `docs/implementation-artifacts/sprint-status.yaml`
