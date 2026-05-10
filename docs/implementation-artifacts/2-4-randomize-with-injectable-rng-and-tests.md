# Story 2.4: Randomize with injectable RNG and tests

Status: review

## Story

As a developer of the simulation core,
I want `randomizeGrid(grid, density?, rng?)` that accepts a seedable RNG,
so that production uses `Math.random` while tests use a deterministic seed for
reproducibility.

## Acceptance Criteria

1. **Given** the function signature `randomizeGrid(grid, density = 0.3, rng = Math.random): Grid`,
   **When** called without arguments beyond `grid`,
   **Then** each cell is independently alive with probability ~0.3.
   (Verified statistically in tests via a fixed-seed RNG over a large grid, not by asserting
   a single `Math.random` draw.)

2. **Given** a deterministic seeded RNG (inline `mulberry32`),
   **When** `randomizeGrid` is called twice with the same seed and same grid dimensions,
   **Then** the two output grids are byte-identical.

3. **Given** `density = 0`,
   **When** `randomizeGrid` is called,
   **Then** the result is all-dead (every cell 0).

4. **Given** `density = 1`,
   **When** `randomizeGrid` is called,
   **Then** the result is all-alive (every cell 1).

5. **Given** the spec lives at `libs/sim/src/lib/grid.spec.ts`,
   **When** `pnpm nx test sim` runs,
   **Then** all randomize-related assertions pass alongside the existing suite.

## Tasks / Subtasks

- [x] Implement `randomizeGrid` in `libs/sim/src/lib/grid.ts` (AC: #1–#4)
  - [x] Signature: `randomizeGrid(grid: Grid, density = 0.3, rng: () => number = Math.random): Grid`
  - [x] Allocate new `Uint8Array`; never mutate input
  - [x] Each cell alive when `rng() < density`; density=0 → all dead, density=1 → all alive
  - [x] Export from `libs/sim/src/index.ts`
- [x] Write Jest specs in `libs/sim/src/lib/grid.spec.ts` (AC: #1–#5)
  - [x] AC #1 — density test: seeded mulberry32 over 10 000-cell grid, count within ±5% of 0.3
  - [x] AC #2 — determinism: two calls with same seeded RNG produce byte-identical grids
  - [x] AC #3 — density=0 → all dead
  - [x] AC #4 — density=1 → all alive
- [x] Run `pnpm nx test sim` — all specs pass (AC: #5)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 2-4 → done
