# Story 2.1: Grid types and primitives with tests

Status: review

## Story

As a developer of the simulation core,
I want a `Grid` type backed by a flat `Uint8Array` plus pure helpers (`createGrid`, `cloneGrid`, `getCell`, `setCell`, `toggleCell`, `clearGrid`),
so that the rules engine has a stable, allocation-controlled, framework-free data model to operate on.

## Acceptance Criteria

1. **Given** the `Grid` interface is defined as `{ readonly width: number; readonly height: number; readonly cells: Uint8Array }` in `libs/types` and re-exported from `libs/sim`,
   **When** any helper is called,
   **Then** it returns a new `Grid` rather than mutating the input (immutability invariant).
   **And** `getCell(g, x, y)` returns `0` for any out-of-bounds `(x, y)` (off-grid is dead, per FR10).

2. **Given** Jest specs co-located with the source,
   **When** `pnpm nx test sim` runs,
   **Then** specs assert: `createGrid(w, h)` produces `cells.length === w*h` all-zero; `setCell` flips exactly the indexed cell; `toggleCell` is its own inverse; `clearGrid` zeroes every cell; `cloneGrid` returns a deep-equal but reference-distinct grid.

3. **Given** the boundary rule from story 1.2 is active,
   **When** any of these source files imports React, `next/*`, `@nestjs/*`, or `fetch`,
   **Then** lint fails (verified by the `@nx/enforce-module-boundaries` rule — `scope:sim` may only depend on `scope:types`).

## Tasks / Subtasks

- [x] Add Jest configuration to `libs/sim` (AC: #2)
  - [x] Create `libs/sim/jest.config.ts` using `jest.preset.js` and `ts-jest` transform, `testEnvironment: 'node'`
  - [x] Create `libs/sim/tsconfig.spec.json` extending `tsconfig.base.json` with `types: ["jest", "node"]`, including `src/**/*.spec.ts`
  - [x] Update `libs/sim/tsconfig.json` to add `{ "path": "./tsconfig.spec.json" }` to `references`
- [x] Define `Grid` interface in `libs/types` (AC: #1)
  - [x] Create `libs/types/src/lib/grid.ts` exporting `Grid` interface: `{ readonly width: number; readonly height: number; readonly cells: Uint8Array }`
  - [x] Update `libs/types/src/index.ts` to add `export * from './lib/grid.js'` (nodenext `.js` extension required)
- [x] Implement pure grid helpers in `libs/sim` (AC: #1)
  - [x] Create `libs/sim/src/lib/grid.ts` with `createGrid`, `cloneGrid`, `getCell`, `setCell`, `toggleCell`, `clearGrid` — all pure (return new `Grid`, never mutate)
  - [x] Update `libs/sim/src/index.ts` to export from `'./lib/grid.js'` (replace scaffold `'./lib/sim.js'` export)
- [x] Write Jest specs co-located with source (AC: #2)
  - [x] Create `libs/sim/src/lib/grid.spec.ts` asserting all ACs in criterion 2 plus: `getCell` returns `0` for out-of-bounds x and y; `setCell(g, x, y, 0)` kills a live cell; `createGrid` throws `RangeError` on non-positive dimensions
- [x] Verify CI targets pass (AC: #2, #3)
  - [x] `pnpm nx test sim` green locally
  - [x] `pnpm nx lint sim` green (no cross-boundary imports)
  - [x] `pnpm nx typecheck sim` green

## Dev Notes

### Jest configuration for `libs/sim`

`libs/sim` was created with `@nx/js:lib` without `--unitTestRunner=jest`, so it has no Jest config. The `@nx/jest/plugin` in `nx.json` picks up any project with a `jest.config.*` file and injects a `test` target automatically — no changes to `project.json` or `nx.json` needed.

**`libs/sim/jest.config.ts`** (exact shape to create):

```typescript
export default {
  displayName: 'sim',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/libs/sim',
};
```

**`libs/sim/tsconfig.spec.json`** (exact shape to create):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./out-tsc/jest",
    "types": ["jest", "node"]
  },
  "include": [
    "jest.config.ts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts"
  ],
  "references": [
    {
      "path": "./tsconfig.json"
    }
  ]
}
```

**`libs/sim/tsconfig.json` — add spec reference** (the `references` array is currently empty):

```json
{
  "extends": "../../tsconfig.base.json",
  "files": [],
  "include": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

### `Grid` type placement

`Grid` lives in `libs/types` because it is the shared data contract between `libs/sim` (writer) and `apps/web` (reader). Module boundaries enforce that `scope:sim → scope:types` is allowed and `scope:app → scope:types` is allowed, so both sides can reference the same type without coupling sim to the app.

**`libs/types/src/lib/grid.ts`**:

```typescript
export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
}
```

**`libs/types/src/index.ts`** — add export (keep existing `'./lib/types.js'` unless it is replaced by `grid.ts`; the scaffold `types()` function is throwaway — replacing the barrel is fine):

```typescript
export * from './lib/grid.js';
```

### Helper function signatures and invariants

All helpers live in `libs/sim/src/lib/grid.ts`. All are pure (they never mutate the input `grid`).

```typescript
import type { Grid } from '@conways-game-of-life/types';

export function createGrid(width: number, height: number): Grid
// Throws RangeError if width <= 0 or height <= 0
// Returns { width, height, cells: new Uint8Array(width * height) }

export function cloneGrid(grid: Grid): Grid
// Returns { width, height, cells: new Uint8Array(grid.cells) }

export function getCell(grid: Grid, x: number, y: number): 0 | 1
// Returns 0 for any out-of-bounds (x, y). Off-grid is always dead.

export function setCell(grid: Grid, x: number, y: number, alive: 0 | 1): Grid
// Returns new Grid with cell [y * width + x] set to `alive`. No-op (returns clone) if out-of-bounds.

export function toggleCell(grid: Grid, x: number, y: number): Grid
// Returns new Grid with cell flipped. No-op (returns clone) if out-of-bounds.

export function clearGrid(grid: Grid): Grid
// Returns new Grid with all cells set to 0.
```

Cell index formula: `cells[y * width + x]` — row-major layout, consistent with the render loop in architecture §5.3.

### `libs/sim/src/index.ts` — replace scaffold barrel

The current export (`export * from './lib/sim.js'`) references the scaffold placeholder. Replace it entirely:

```typescript
export * from './lib/grid.js';
```

### Module boundary constraint

`libs/sim` must import `Grid` via the path alias `@conways-game-of-life/types`, not a relative path. The ESLint boundary rule enforces this at the project-tag level (`scope:sim` may only depend on `scope:types`). Direct relative imports across lib boundaries (`../../types/src/...`) would bypass the boundary check and are forbidden.

### `nodenext` module resolution — `.js` extension requirement

Both `libs/sim/tsconfig.lib.json` and `libs/types/tsconfig.lib.json` use `module: nodenext` / `moduleResolution: nodenext`. Under this setting, TypeScript requires explicit `.js` extensions on relative imports even though the source files are `.ts`. Every relative import in `libs/sim/src/lib/grid.ts` must use `.js`:

```typescript
// CORRECT
import type { Grid } from '@conways-game-of-life/types'; // path alias, no extension needed

// WRONG (no extension — fails nodenext)
import type { Grid } from './grid';
```

Path aliases in `tsconfig.base.json` point to `.ts` source files via the `@conways-game-of-life/source` condition — no extension needed for those.

### `tsconfig.spec.json` — no `nodenext` override needed

The spec tsconfig extends `tsconfig.base.json` (which uses `module: esnext`, `moduleResolution: bundler`). Test files do **not** need `.js` extensions on relative imports. `ts-jest` compiles the specs with the spec tsconfig, not the lib tsconfig. Keep the spec tsconfig minimal — just `types: ["jest", "node"]` and the spec include glob.

### Test spec guidance (`libs/sim/src/lib/grid.spec.ts`)

Tests must constrain behavior, not just hit coverage. Required assertions (per AC #2):

```typescript
// createGrid
expect(createGrid(5, 3).cells.length).toBe(15);
expect(Array.from(createGrid(5, 3).cells)).toEqual(Array(15).fill(0));
expect(() => createGrid(0, 5)).toThrow(RangeError);

// cloneGrid
const a = createGrid(3, 3);
const b = cloneGrid(a);
expect(b).not.toBe(a);
expect(b.cells).not.toBe(a.cells);
expect(Array.from(b.cells)).toEqual(Array.from(a.cells));

// setCell / getCell
const g = setCell(createGrid(3, 3), 1, 1, 1);
expect(getCell(g, 1, 1)).toBe(1);
expect(getCell(g, 0, 0)).toBe(0); // only one cell changed

// getCell out-of-bounds
expect(getCell(createGrid(3, 3), -1, 0)).toBe(0);
expect(getCell(createGrid(3, 3), 3, 0)).toBe(0);
expect(getCell(createGrid(3, 3), 0, 3)).toBe(0);

// toggleCell is its own inverse
const t1 = toggleCell(createGrid(3, 3), 1, 1);
const t2 = toggleCell(t1, 1, 1);
expect(getCell(t1, 1, 1)).toBe(1);
expect(getCell(t2, 1, 1)).toBe(0);

// clearGrid
const live = setCell(createGrid(3, 3), 0, 0, 1);
expect(getCell(clearGrid(live), 0, 0)).toBe(0);
expect(Array.from(clearGrid(live).cells)).toEqual(Array(9).fill(0));

// immutability: helpers never mutate input
const original = createGrid(3, 3);
setCell(original, 1, 1, 1);
expect(getCell(original, 1, 1)).toBe(0);
```

### Project Structure Notes

- `Grid` interface → `libs/types/src/lib/grid.ts` (new file)
- `libs/types/src/index.ts` → replace scaffold export with `export * from './lib/grid.js'`
- Grid helpers → `libs/sim/src/lib/grid.ts` (new file)
- Grid tests → `libs/sim/src/lib/grid.spec.ts` (new file)
- `libs/sim/src/index.ts` → replace `'./lib/sim.js'` with `'./lib/grid.js'`
- `libs/sim/jest.config.ts` → new; adds `test` target via `@nx/jest/plugin`
- `libs/sim/tsconfig.spec.json` → new; used by `ts-jest`
- `libs/sim/tsconfig.json` → add `tsconfig.spec.json` to `references`
- `libs/sim/src/lib/sim.ts` → can be deleted (scaffold placeholder; replaced by `grid.ts`)

**No changes needed to:**
- `nx.json` — `@nx/jest/plugin` already wired
- `project.json` in `libs/sim` — `test` target is auto-inferred from `jest.config.ts`
- ESLint config — module boundary rule already enforces `scope:sim → scope:types` from story 1.2

### References

- [Source: docs/planning-artifacts/epics.md#Story-2.1] — ACs, helper signatures, test assertions
- [Source: docs/planning-artifacts/architecture.md#5.1] — `Grid` as `{ width, height, cells: Uint8Array }`, cell index formula `y * width + x`
- [Source: docs/planning-artifacts/architecture.md#5.6] — module boundary: `scope:sim` only depends on `scope:types`
- [Source: docs/planning-artifacts/architecture.md#5.7] — RNG discipline (deferred to story 2.4)
- [Source: libs/sim/tsconfig.lib.json] — `module: nodenext` requires `.js` extensions on relative imports
- [Source: nx.json] — `@nx/jest/plugin` with `targetName: "test"` auto-discovers `jest.config.*`
- [Source: apps/web/jest.config.cts] — reference for `jest.preset.js` + `ts-jest` pattern
- [Source: docs/implementation-artifacts/epic-1-retro-2026-05-09.md#Action-Items] — delete scaffold components immediately; verify typecheck locally before opening PR

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `tsconfig.lib.json` was including `*.spec.ts` files via `src/**/*.ts`, causing TS2835 (missing `.js` extension) and TS2593 (missing jest types). Fixed by adding `"exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"]` to `tsconfig.lib.json`.
- `tsconfig.spec.json` initially referenced `tsconfig.json`, causing TS6202 (circular project reference). Fixed by changing the reference to `tsconfig.lib.json`.
- `nx sync` ran automatically to add `../types/tsconfig.lib.json` reference to `libs/sim/tsconfig.lib.json` (dependency on `libs/types`).

### Completion Notes List

- Added Jest config (`jest.config.ts`, `tsconfig.spec.json`) to `libs/sim`; `@nx/jest/plugin` auto-injects `test` target.
- Defined `Grid` interface in `libs/types/src/lib/grid.ts`; replaced scaffold barrel in `libs/types/src/index.ts`.
- Implemented 6 pure grid helpers in `libs/sim/src/lib/grid.ts` — all return new `Grid`, never mutate input.
- Wrote 24 Jest specs covering createGrid (4), cloneGrid (2), getCell (6), setCell (4), toggleCell (3), clearGrid (2), immutability (3).
- Deleted scaffold `libs/sim/src/lib/sim.ts`; replaced barrel with `grid.js` export.
- `pnpm nx test sim`: 24/24 passing. `pnpm nx lint sim`: clean. `pnpm nx typecheck sim`: clean. No regressions in affected projects.

### File List

- `libs/types/src/lib/grid.ts` — new; `Grid` interface definition
- `libs/types/src/index.ts` — modified; replaced scaffold export with `grid.js`
- `libs/sim/src/lib/grid.ts` — new; pure helper implementations
- `libs/sim/src/lib/grid.spec.ts` — new; 24 Jest tests
- `libs/sim/src/lib/sim.ts` — deleted; scaffold placeholder
- `libs/sim/src/index.ts` — modified; replaced scaffold barrel with `grid.js`
- `libs/sim/jest.config.ts` — new; ts-jest config, activates `test` target
- `libs/sim/tsconfig.spec.json` — new; TypeScript config for Jest specs
- `libs/sim/tsconfig.json` — modified; added `tsconfig.spec.json` reference
- `libs/sim/tsconfig.lib.json` — modified; added exclude for spec files, nx sync added `types` reference
