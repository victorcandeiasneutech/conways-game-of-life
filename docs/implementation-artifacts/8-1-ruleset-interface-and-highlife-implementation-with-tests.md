# Story 8.1: `RuleSet` interface and HighLife implementation with tests

Status: review

## Story

As a developer of the simulation core,
I want `RuleSet` as a typed interface and `highLifeRules` as a second implementation alongside `conwayRules`,
So that adding a third rule set later is a one-PR job without restructuring.

## Acceptance Criteria

1. **Given** `RuleSet` defined as `{ id: string; name: string; step(grid: Grid): Grid }` in `libs/types`,
   **When** `conwayRules` and `highLifeRules` are exported from `libs/sim`,
   **Then** both conform to the interface and are interchangeable at the call site.

2. **Given** Jest specs for HighLife (B36/S23),
   **When** `pnpm nx test sim` runs,
   **Then** specs verify HighLife birth-6 behavior (B36-only birth on 6 live neighbors) and assert the rule diverges from Conway on a 6-neighbor case (where HighLife births a cell but Conway does not).

3. **Given** the boundary rule remains active,
   **When** the new rule set lands,
   **Then** `libs/sim` still imports nothing outside `libs/types`.

## Tasks / Subtasks

- [x] Create `libs/sim/src/lib/rules/highlife.ts` — `highLifeRules: RuleSet` implementing B36/S23 (AC: 1, 2)
- [x] Create `libs/sim/src/lib/rules/highlife.spec.ts` — tests for B3 birth, B6 birth, S23 survival, death on overpopulation, and Conway divergence on 6-neighbor case (AC: 2)
- [x] Export `highLifeRules` from `libs/sim/src/index.ts` (AC: 1)
- [x] Run `pnpm nx test sim --skip-nx-cache` — all pass (AC: 1, 2)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1–3)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 8-1 → review; epic-8 → in-progress

## Dev Notes

### What already exists

- `libs/types/src/lib/rule-set.ts` — `RuleSet` interface already defined:
  ```typescript
  export interface RuleSet {
    readonly id: string;
    readonly name: string;
    step(grid: Grid): Grid;
  }
  ```
- `libs/sim/src/lib/rules/conway.ts` — `step()` function + `conwayRules: RuleSet` already exported
- `libs/sim/src/index.ts` — already exports from `./lib/rules/conway`
- `libs/types/src/index.ts` — already exports `rule-set.js`

**This story is purely additive** — no existing code changes are needed except adding the `highlife` export to `libs/sim/src/index.ts`.

### HighLife rules — B36/S23

HighLife uses:
- **Birth (B36):** A dead cell is born if it has exactly **3 OR 6** live neighbors
- **Survival (S23):** A live cell survives if it has exactly **2 OR 3** live neighbors

Implementation pattern (mirrors conway.ts):

```typescript
import type { Grid, RuleSet } from '@conways-game-of-life/types';

function step(grid: Grid): Grid {
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
        }
      }
      const alive = cells[y * width + x];
      next[y * width + x] =
        alive === 1
          ? (neighbors === 2 || neighbors === 3 ? 1 : 0)  // S23
          : (neighbors === 3 || neighbors === 6 ? 1 : 0);  // B36
    }
  }
  return { width, height, cells: next };
}

export const highLifeRules: RuleSet = {
  id: 'highlife',
  name: 'HighLife',
  step,
};
```

### Divergence test — 6-neighbor case

A dead cell with exactly 6 live neighbors:
- **Conway:** stays dead (B3 only — 6 ≠ 3)
- **HighLife:** becomes alive (B36 — 6 is in the birth set)

Setup in a 5×5 grid — center cell (2,2) is dead, 6 of its 8 neighbors are alive:

```
. . . . .
. X X X .
. X . X .
. X . . .
. . . . .
```
Live cells: (1,1),(2,1),(3,1),(1,2),(3,2),(1,3) → 6 neighbors for (2,2).

```typescript
it('births a dead cell with 6 live neighbors (B6 — HighLife only)', () => {
  let g = createGrid(5, 5);
  for (const [x, y] of [[1,1],[2,1],[3,1],[1,2],[3,2],[1,3]] as [number,number][]) {
    g = setCell(g, x, y, 1);
  }
  // HighLife births (2,2)
  expect(getCell(highLifeRules.step(g), 2, 2)).toBe(1);
  // Conway does NOT birth (2,2)
  expect(getCell(conwayRules.step(g), 2, 2)).toBe(0);
});
```

### Module boundary

`libs/sim` has tag `scope:sim`. It may only depend on `scope:types`. `highlife.ts` imports only from `@conways-game-of-life/types` — no boundary violation.

### No worker changes needed

Story 8.2 will wire the rule set selection into the worker. Story 8.1 is purely the `libs/sim` addition.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `RuleSet` interface and `conwayRules` already existed from prior work — story 8.1 was purely additive: one new file (`highlife.ts`), one new spec, one export line.
- HighLife B36/S23: born on 3 or 6 neighbors, survives on 2 or 3. Survival rules are identical to Conway; only birth differs (adds 6-neighbor case).
- Divergence test confirms the B6 rule: dead cell with 6 live neighbors is born in HighLife but not in Conway.
- 2×2 block still-life test: same as Conway because S23 survival rules are identical.
- 65 sim tests pass total (55 existing Conway/grid/pattern + 10 new HighLife); all 7 affected projects green on lint, typecheck, test.

### File List

- `libs/sim/src/lib/rules/highlife.ts`
- `libs/sim/src/lib/rules/highlife.spec.ts`
- `libs/sim/src/index.ts`
- `docs/implementation-artifacts/8-1-ruleset-interface-and-highlife-implementation-with-tests.md`
- `docs/implementation-artifacts/sprint-status.yaml`
