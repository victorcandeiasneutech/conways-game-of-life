# Story 2.3: Edge-case and boundary tests for `step()`

Status: review

## Story

As a developer of the simulation core,
I want explicit Jest coverage of edge cases the four rules don't visibly exercise,
so that the test suite constrains real behavior, not just the happy path.

## Acceptance Criteria

1. **Given** an empty grid (all cells dead),
   **When** `step()` is applied,
   **Then** the result is still empty — no spontaneous life.

2. **Given** a 3×3 grid with all nine cells alive,
   **When** `step()` is applied,
   **Then** only the four corners survive and everything else dies.
   **Note:** corners have exactly 3 live neighbors → survive (rule 2); edges have 5 live
   neighbors → die (rule 3); center has 8 → dies (rule 3). Expected output (row-major):
   alive at `(0,0)`, `(2,0)`, `(0,2)`, `(2,2)` — i.e. `#.#/.../#.#`. The epics.md AC
   contained an error ("corners die"); this story file has the hand-verified correct result.

3. **Given** a live cell at corner `(0,0)` of a 5×5 grid with no other live cells,
   **When** `step()` is applied,
   **Then** the cell dies — off-grid neighbors are treated as dead so neighbor count is 0
   (rule 1: underpopulation).

4. **Given** a 1×1 grid with a single live cell,
   **When** `step()` is applied,
   **Then** the cell dies — no neighbors possible in a 1×1 grid (rule 1).

5. **Given** all the above tests are co-located in `libs/sim/src/lib/rules/conway.spec.ts`,
   **When** `pnpm nx test sim` runs,
   **Then** all tests (including the existing 2.2 suite) pass and complete in under 10 s.

## Tasks / Subtasks

- [x] Add edge-case describe blocks to `libs/sim/src/lib/rules/conway.spec.ts` (AC: #1–#5)
  - [x] AC #1 — empty grid stays empty: `createGrid(5,5)` → `step()` → all zeros
  - [x] AC #2 — all-alive 3×3: verify only corners survive (`#.#/.../#.#` pattern)
  - [x] AC #3 — corner cell with no neighbors dies on 5×5 grid
  - [x] AC #4 — 1×1 live cell dies
- [x] Run `pnpm nx test sim` and confirm all specs pass (AC: #5)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 2-3 → done
