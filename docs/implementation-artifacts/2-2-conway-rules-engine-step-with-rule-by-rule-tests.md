# Story 2.2: Conway rules engine `step()` with rule-by-rule tests

Status: review

## Story

As a developer of the simulation core,
I want a pure `step(grid: Grid): Grid` that applies Conway's four rules with off-grid neighbors treated as dead,
so that FR10 has a single canonical implementation that both the web app and (stretch) the API can reuse.

## Acceptance Criteria

1. **Given** a 3×3 grid with a single live cell at center,
   **When** `step()` is applied,
   **Then** the resulting grid has zero live cells (rule 1: underpopulation — fewer than 2 live neighbors).

2. **Given** a grid with a 2×2 block of live cells,
   **When** `step()` is applied repeatedly across five generations,
   **Then** the grid is unchanged each generation (rule 2: 2–3 neighbors survive — canonical still life).

3. **Given** a grid where a live cell has exactly 4 live neighbors,
   **When** `step()` is applied,
   **Then** that cell is dead in the next generation (rule 3: overpopulation — more than 3 neighbors).

4. **Given** a 5×5 grid with a horizontal blinker (live cells at `(1,2)`, `(2,2)`, `(3,2)`),
   **When** `step()` is applied once,
   **Then** the result is a vertical blinker (`(2,1)`, `(2,2)`, `(2,3)` alive, `(1,2)` and `(3,2)` dead).
   **And** applying `step()` a second time restores the original horizontal blinker (rule 4 reproduction + rule 1 underpopulation; period-2 oscillator).

5. **Given** the canonical glider placed at `(1,0)`, `(2,1)`, `(0,2)`, `(1,2)`, `(2,2)` on a 10×10 grid,
   **When** `step()` is applied four times,
   **Then** the live-cell positions are `(2,1)`, `(3,2)`, `(1,3)`, `(2,3)`, `(3,3)` — the initial pattern translated by `(+1, +1)` (canonical spaceship).

6. **Given** the same input grid,
   **When** `step()` is called 100 times on independent clones of that grid,
   **Then** all 100 outputs have byte-identical `cells` arrays (determinism).

7. **Given** all the above tests are co-located in `libs/sim/src/lib/rules/conway.spec.ts`,
   **When** `pnpm nx test sim` runs,
   **Then** all tests pass and the full suite completes in under 10 seconds.

## Tasks / Subtasks

- [x] Add `RuleSet` interface to `libs/types` (AC: #5)
  - [x] Create `libs/types/src/lib/rule-set.ts` exporting `RuleSet`: `{ readonly id: string; readonly name: string; step(grid: Grid): Grid }`
  - [x] Update `libs/types/src/index.ts` to add `export * from './lib/rule-set.js'`
- [x] Implement `step()` and `conwayRules` in `libs/sim/src/lib/rules/conway.ts` (AC: #1–#6)
  - [x] Create `libs/sim/src/lib/rules/` directory
  - [x] Implement `step(grid: Grid): Grid` — allocates exactly one new `Uint8Array`, no mutation, off-grid neighbors are dead
  - [x] Export `conwayRules: RuleSet` as `{ id: 'conway', name: "Conway's Game of Life", step }`
  - [x] Update `libs/sim/src/index.ts` to add `export * from './lib/rules/conway.js'`
- [x] Write rule-by-rule Jest specs in `libs/sim/src/lib/rules/conway.spec.ts` (AC: #1–#7)
  - [x] Rule 1 — underpopulation: single live cell on 3×3 → all dead
  - [x] Rule 2 — survival: 2×2 block still-life over 5 generations
  - [x] Rule 3 — overpopulation: cell with 4 live neighbors dies
  - [x] Rule 4 / blinker — reproduction + underpopulation: period-2 oscillator, assert both phases
  - [x] Glider — spaceship: 4-step diagonal translation `(+1, +1)` on 10×10 grid
  - [x] Determinism: 100 identical runs produce byte-identical output
- [x] Verify CI targets pass (AC: #7)
  - [x] `pnpm nx test sim` green (all specs including previous story 2.1 specs)
  - [x] `pnpm nx lint sim` green
  - [x] `pnpm nx typecheck sim` green

## Dev Notes

### Conway's four rules (authoritative reference)

| Rule | Condition | Outcome |
|---|---|---|
| 1 — Underpopulation | Live cell with **< 2** live neighbors | **Dies** |
| 2 — Survival | Live cell with **2 or 3** live neighbors | **Survives** |
| 3 — Overpopulation | Live cell with **> 3** live neighbors | **Dies** |
| 4 — Reproduction | Dead cell with **exactly 3** live neighbors | **Becomes alive** |

Off-grid neighbors are always treated as dead (no toroidal wrap in MVP). Source: architecture §5.1.

### `step()` — exact implementation shape

Lives in `libs/sim/src/lib/rules/conway.ts`. Allocates exactly **one** new `Uint8Array` per call (not two). Never mutates the input grid.

```typescript
import type { Grid } from '@conways-game-of-life/types';

export function step(grid: Grid): Grid {
  const { width, height, cells } = grid;
  const next = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors += cells[ny * width + nx];
          }
          // out-of-bounds: implicit 0 (off-grid is dead)
        }
      }
      const alive = cells[y * width + x];
      next[y * width + x] =
        alive === 1
          ? (neighbors === 2 || neighbors === 3 ? 1 : 0)
          : (neighbors === 3 ? 1 : 0);
    }
  }
  return { width, height, cells: next };
}
```

Cell index formula: `cells[y * width + x]` — row-major layout, consistent with `grid.ts` from story 2.1.

### `RuleSet` interface — `libs/types/src/lib/rule-set.ts`

```typescript
import type { Grid } from './grid.js';

export interface RuleSet {
  readonly id: string;
  readonly name: string;
  step(grid: Grid): Grid;
}
```

**Note:** Uses `.js` extension on the relative import because `libs/types/tsconfig.lib.json` uses `module: nodenext` / `moduleResolution: nodenext`. This is the same pattern established in story 2.1.

### `conwayRules` export

```typescript
export const conwayRules: RuleSet = {
  id: 'conway',
  name: "Conway's Game of Life",
  step,
};
```

The `RuleSet` seam exists for story 8.1 (HighLife rules). `conwayRules` is registered by the web app's reducer in Epic 3; the story 3 dev agent will reach for it via `@conways-game-of-life/sim`. Do not add HighLife here — that is story 8.1.

### Barrel update — `libs/sim/src/index.ts`

Add alongside the existing `grid.js` export:

```typescript
export * from './lib/grid.js';
export * from './lib/rules/conway.js';
```

`.js` extension required — `libs/sim/tsconfig.lib.json` uses `moduleResolution: nodenext`.

### `libs/types/src/index.ts` barrel update

Add:
```typescript
export * from './lib/grid.js';
export * from './lib/rule-set.js';
```

### Test spec file placement and import style

File: `libs/sim/src/lib/rules/conway.spec.ts`

**Imports**: `tsconfig.spec.json` uses `moduleResolution: bundler` (inherits from `tsconfig.base.json`). No `.js` extension required in spec files. Import directly:

```typescript
import { step, conwayRules } from './conway';
import { createGrid, setCell, getCell, cloneGrid } from '../grid';
import type { Grid } from '@conways-game-of-life/types';
```

### Exact test assertions for each AC

**Rule 1 — underpopulation (AC #1)**

```typescript
it('kills a live cell with no neighbors (rule 1)', () => {
  const g = setCell(createGrid(3, 3), 1, 1, 1);
  const next = step(g);
  expect(Array.from(next.cells)).toEqual(Array(9).fill(0));
});

it('kills a live cell with exactly 1 live neighbor (rule 1)', () => {
  let g = createGrid(5, 5);
  g = setCell(g, 1, 1, 1);
  g = setCell(g, 1, 2, 1); // neighbor of (1,1)
  const next = step(g);
  expect(getCell(next, 1, 1)).toBe(0); // only 1 neighbor → dies
});
```

**Rule 2 — survival (AC #2)**

The 2×2 block on a 4×4 grid is the canonical still life. Each of the 4 cells has exactly 3 live neighbors and no dead cell adjacent to the block accumulates 3 live neighbors.

```typescript
it('leaves a 2×2 block unchanged for 5 generations (rule 2 still-life)', () => {
  let g = createGrid(4, 4);
  g = setCell(g, 1, 1, 1);
  g = setCell(g, 2, 1, 1);
  g = setCell(g, 1, 2, 1);
  g = setCell(g, 2, 2, 1);
  const initial = Array.from(g.cells);
  for (let i = 0; i < 5; i++) {
    g = step(g);
    expect(Array.from(g.cells)).toEqual(initial);
  }
});
```

**Rule 3 — overpopulation (AC #3)**

A live center cell with exactly 4 live diagonal neighbors — none of the corner neighbors can birth additional cells, making the test clean.

```typescript
it('kills a live cell with 4 live neighbors (rule 3)', () => {
  // Center (1,1) with 4 live diagonal neighbors
  let g = createGrid(3, 3);
  g = setCell(g, 1, 1, 1); // center — under test
  g = setCell(g, 0, 0, 1);
  g = setCell(g, 2, 0, 1);
  g = setCell(g, 0, 2, 1);
  g = setCell(g, 2, 2, 1);
  // center (1,1) has 4 live neighbors → overpopulation → dies
  expect(getCell(step(g), 1, 1)).toBe(0);
});
```

**Rule 4 + blinker (AC #4)**

Horizontal blinker at y=2 on a 5×5 grid. Verifies both phases explicitly.

```typescript
it('oscillates a horizontal blinker to vertical and back (rules 1+4)', () => {
  let g = createGrid(5, 5);
  g = setCell(g, 1, 2, 1);
  g = setCell(g, 2, 2, 1);
  g = setCell(g, 3, 2, 1);
  const initialCells = Array.from(g.cells);

  const gen1 = step(g);
  // Vertical blinker: (2,1), (2,2), (2,3) alive
  expect(getCell(gen1, 2, 1)).toBe(1);
  expect(getCell(gen1, 2, 2)).toBe(1);
  expect(getCell(gen1, 2, 3)).toBe(1);
  // Original horizontal cells are dead
  expect(getCell(gen1, 1, 2)).toBe(0);
  expect(getCell(gen1, 3, 2)).toBe(0);

  const gen2 = step(gen1);
  // Back to original horizontal blinker
  expect(Array.from(gen2.cells)).toEqual(initialCells);
});
```

**Glider (AC #5)**

The canonical glider in the `..#` / `.##` / `..#` / `...` arrangement (standard "southeast-traveling" orientation):

Initial live cells: `(1,0)`, `(2,1)`, `(0,2)`, `(1,2)`, `(2,2)`

After 4 `step()` calls on a 10×10 grid, the live cells are:
`(2,1)`, `(3,2)`, `(1,3)`, `(2,3)`, `(3,3)` — initial pattern translated by `(+1, +1)`.

```typescript
function getLiveCells(grid: Grid): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (getCell(grid, x, y) === 1) result.push([x, y]);
    }
  }
  return result.sort(([ax, ay], [bx, by]) => (ay !== by ? ay - by : ax - bx));
}

it('translates a glider by (1,1) every 4 generations (canonical spaceship)', () => {
  let g = createGrid(10, 10);
  // Standard glider: (1,0),(2,1),(0,2),(1,2),(2,2)
  const initial: Array<[number, number]> = [[1,0],[2,1],[0,2],[1,2],[2,2]];
  for (const [x, y] of initial) g = setCell(g, x, y, 1);

  for (let i = 0; i < 4; i++) g = step(g);

  const expected: Array<[number, number]> = initial
    .map(([x, y]) => [x + 1, y + 1] as [number, number])
    .sort(([ax, ay], [bx, by]) => (ay !== by ? ay - by : ax - bx));

  expect(getLiveCells(g)).toEqual(expected);
});
```

**Determinism (AC #6)**

```typescript
it('produces byte-identical output for 100 identical runs (determinism)', () => {
  let seed = createGrid(5, 5);
  seed = setCell(seed, 1, 2, 1);
  seed = setCell(seed, 2, 2, 1);
  seed = setCell(seed, 3, 2, 1); // horizontal blinker

  const reference = Array.from(step(cloneGrid(seed)).cells);
  for (let i = 0; i < 99; i++) {
    expect(Array.from(step(cloneGrid(seed)).cells)).toEqual(reference);
  }
});
```

### `step()` performance note

The double `for` loop over all `width * height` cells is O(n) where n = number of cells. At MVP scale (50×50 = 2500 cells), each step is microseconds on modern V8. The 10s Jest timeout is not a concern. The inner neighbor loop is always 8 iterations regardless of grid size.

### Previous story learnings (from story 2.1)

- **`tsconfig.lib.json` must exclude `*.spec.ts` and `*.test.ts`** — added in story 2.1. No change needed for this story; pattern is already established.
- **`tsconfig.spec.json` references `tsconfig.lib.json`** (not `tsconfig.json`) — circular reference fix from story 2.1. Pattern is in place; `conway.spec.ts` lives under `src/**/*.spec.ts` which is already included.
- **`.js` extensions on relative imports in lib source files** — required by `moduleResolution: nodenext`. `conway.ts` will import from `@conways-game-of-life/types` (path alias, no extension needed) and the barrel will use `'./lib/rules/conway.js'`.
- **`pnpm nx sync`** — may run automatically if new TypeScript project references are needed. Let it complete.
- **`nx sync` triggers** — adding a new import dependency (e.g., `rule-set.ts` in `libs/types` imported by `libs/sim`) may prompt `nx sync` to add a reference to `tsconfig.lib.json`. This is expected.

### Project Structure Notes

- `libs/types/src/lib/rule-set.ts` — new; `RuleSet` interface
- `libs/types/src/index.ts` — modified; add `rule-set.js` export
- `libs/sim/src/lib/rules/conway.ts` — new; `step()` function + `conwayRules` export
- `libs/sim/src/lib/rules/conway.spec.ts` — new; rule-by-rule Jest specs
- `libs/sim/src/index.ts` — modified; add `rules/conway.js` export

**No changes needed to:**
- `libs/sim/jest.config.ts` — already configured for all `src/**/*.spec.ts`
- `libs/sim/tsconfig.lib.json` — exclude already covers `*.spec.ts`
- `libs/sim/tsconfig.spec.json` — `src/**/*.spec.ts` glob covers subdirectories
- `libs/sim/project.json` — `test` target auto-inferred from `jest.config.ts`
- `nx.json` — no changes
- ESLint config — `scope:sim → scope:types` already enforced from story 1.2

### References

- [Source: docs/planning-artifacts/epics.md#Story-2.2] — ACs, rule-by-rule test descriptions
- [Source: docs/planning-artifacts/architecture.md#5.1] — `step()` invariants, one-Uint8Array-per-call, off-grid=dead, `RuleSet` interface, `conwayRules` export shape
- [Source: docs/planning-artifacts/project-context.md#Rule-9] — `step(grid: Grid): Grid` is pure, no mutation, throws RangeError only on programmer errors
- [Source: docs/planning-artifacts/project-context.md#Rule-4] — no React/DOM/fetch imports in `libs/sim`
- [Source: libs/sim/src/lib/grid.ts] — `getCell`, `setCell`, `createGrid`, `cloneGrid` available; row-major `cells[y*width+x]`
- [Source: libs/sim/tsconfig.lib.json] — `module: nodenext` requires `.js` extensions on relative imports
- [Source: docs/implementation-artifacts/2-1-grid-types-and-primitives-with-tests.md#Debug-Log] — tsconfig.lib.json exclude pattern, spec→lib tsconfig reference fix

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- No defects encountered. `nx sync` added `../types/tsconfig.lib.json` reference to `libs/sim/tsconfig.lib.json` automatically (new import of `RuleSet` from `@conways-game-of-life/types`).

### Completion Notes List

- Added `RuleSet` interface to `libs/types/src/lib/rule-set.ts`; imports `Grid` from `./grid.js` (nodenext `.js` required).
- Implemented `step(grid: Grid): Grid` in `libs/sim/src/lib/rules/conway.ts` — double nested loop O(n), one `Uint8Array` allocation, off-grid implicit 0, no mutation.
- Exported `conwayRules: RuleSet` as `{ id: 'conway', name: "Conway's Game of Life", step }`.
- Wrote 13 Jest specs across 8 describe blocks: rule 1 (2), rule 2 (2), rule 3 (2), rule 4 (1), blinker (1), glider (1), determinism (1), immutability (1), conwayRules metadata (2).
- `pnpm nx test sim`: 37/37 passing (2 suites, 0.273s). `pnpm nx lint sim`: clean. `pnpm nx typecheck sim`: clean. No regressions.

### File List

- `libs/types/src/lib/rule-set.ts` — new; `RuleSet` interface
- `libs/types/src/index.ts` — modified; added `rule-set.js` export
- `libs/sim/src/lib/rules/conway.ts` — new; `step()` function + `conwayRules` export
- `libs/sim/src/lib/rules/conway.spec.ts` — new; 13 rule-by-rule Jest specs
- `libs/sim/src/index.ts` — modified; added `rules/conway.js` export
- `docs/implementation-artifacts/2-2-conway-rules-engine-step-with-rule-by-rule-tests.md` — new; story file
- `docs/implementation-artifacts/sprint-status.yaml` — modified; 2-1 done, 2-2 in-progress → review
