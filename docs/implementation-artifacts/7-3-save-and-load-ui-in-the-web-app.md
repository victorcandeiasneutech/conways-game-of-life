# Story 7.3: Save and Load UI in the web app

Status: review

## Story

As Casey,
I want to save a starting state with a name and reload it later from a list,
so that I don't have to repaint patterns I want to come back to.

## Acceptance Criteria

1. **Given** a name input and Save button in the sidebar,
   **When** the user types a name and clicks Save,
   **Then** `savePattern` from `@conways-game-of-life/api-client` is called with the current grid's live cells, and the saved-patterns list refreshes.

2. **Given** saved patterns exist,
   **When** the page loads or a save completes,
   **Then** the list is fetched via `listPatterns` and each entry appears as a selectable button.

3. **Given** the user clicks a saved pattern entry,
   **When** the selection is confirmed,
   **Then** the grid resizes to the pattern's exact dimensions, its live cells are placed, and the gen counter resets to 0.

4. **Given** a network or API failure on Save,
   **When** the error is caught,
   **Then** a visible error message appears (role="alert") and no partial state change occurs.

5. **Given** Jest specs for `extractLiveCells` and `gridFromSavedPattern`,
   **When** `pnpm nx test web` runs,
   **Then** all specs pass.

## Tasks / Subtasks

- [x] Create `apps/web/app/lib/grid-from-pattern.ts` — `extractLiveCells` and `gridFromSavedPattern` helpers (AC: 1, 3)
- [x] Create `apps/web/app/lib/grid-from-pattern.spec.ts` — unit tests for both helpers (AC: 5)
- [x] Add `savedPatterns`, `saveName`, `apiError` state to `page.tsx` (AC: 1–4)
- [x] Add `listPatterns` call on mount in `page.tsx` (AC: 2)
- [x] Add `handleSave` and `handleLoad` handlers in `page.tsx` (AC: 1, 3, 4)
- [x] Add Save UI (name input + Save button) to sidebar in `page.tsx` (AC: 1)
- [x] Add Saved patterns list UI to sidebar in `page.tsx` (AC: 2, 3)
- [x] Add error display (role="alert") to sidebar in `page.tsx` (AC: 4)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1–5)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 7-3 → review

## Dev Notes

### Helper functions — `apps/web/app/lib/grid-from-pattern.ts`

Two pure helpers extracted for testability:

```typescript
import type { Grid, SavedPattern } from '@conways-game-of-life/types';

export function extractLiveCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y * grid.width + x] === 1) cells.push([x, y]);
    }
  }
  return cells;
}

export function gridFromSavedPattern(pattern: SavedPattern): Grid {
  const cells = new Uint8Array(pattern.width * pattern.height);
  for (const [x, y] of pattern.liveCells) {
    if (x >= 0 && x < pattern.width && y >= 0 && y < pattern.height) {
      cells[y * pattern.width + x] = 1;
    }
  }
  return { width: pattern.width, height: pattern.height, cells };
}
```

`extractLiveCells` reads the `Uint8Array` flat buffer to produce the `[x, y][]` required by `savePattern`.
`gridFromSavedPattern` builds a plain `Uint8Array`-backed `Grid` without calling `createGrid` — no sim import needed.

### `page.tsx` changes — state additions

```typescript
import { listPatterns, savePattern } from '@conways-game-of-life/api-client';
import type { SavedPattern } from '@conways-game-of-life/types';
import { extractLiveCells, gridFromSavedPattern } from './lib/grid-from-pattern';

// New state (add alongside existing useState calls):
const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>([]);
const [saveName, setSaveName] = useState('');
const [apiError, setApiError] = useState<string | null>(null);
```

### `page.tsx` — mount effect and handlers

```typescript
// Fetch saved patterns on mount (best-effort; fails silently if API is down)
useEffect(() => {
  listPatterns().then(setSavedPatterns).catch(() => {});
}, []);

async function handleSave() {
  setApiError(null);
  try {
    const liveCells = extractLiveCells(grid);
    await savePattern({ name: saveName.trim(), width: grid.width, height: grid.height, liveCells });
    setSaveName('');
    const patterns = await listPatterns();
    setSavedPatterns(patterns);
  } catch {
    setApiError('Save failed. Is the API running?');
  }
}

function handleLoad(pattern: SavedPattern) {
  setApiError(null);
  setRunning(false);
  dispatch({ type: 'place', grid: gridFromSavedPattern(pattern) });
}
```

`handleLoad` reuses the existing `place` reducer action — already resets `genCount: 0`. No new action needed.

### `page.tsx` — sidebar UI additions (after `<GridSizeForm>`)

```jsx
<div className="flex flex-col gap-1">
  <label htmlFor="save-name" className="text-sm text-neutral-400">Save pattern</label>
  <div className="flex gap-2">
    <input
      id="save-name"
      type="text"
      value={saveName}
      onChange={(e) => setSaveName(e.target.value)}
      placeholder="Pattern name"
      className="flex-1 rounded px-2 py-1.5 text-sm bg-neutral-800 text-white border border-neutral-600 placeholder-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    />
    <button
      onClick={handleSave}
      disabled={!saveName.trim()}
      className="rounded px-3 py-1.5 text-sm font-medium bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
    >
      Save
    </button>
  </div>
</div>

{savedPatterns.length > 0 && (
  <div className="flex flex-col gap-1">
    <span className="text-sm text-neutral-400">Saved patterns</span>
    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
      {savedPatterns.map((p) => (
        <li key={p.id}>
          <button
            onClick={() => handleLoad(p)}
            className="w-full text-left rounded px-2 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            {p.name}
          </button>
        </li>
      ))}
    </ul>
  </div>
)}

{apiError && (
  <p role="alert" className="text-sm text-red-400">{apiError}</p>
)}
```

### Existing tests stay green

The mount effect calls `listPatterns().catch(() => {})`. In the Jest/jsdom test environment, `fetch` will fail (connection refused to localhost:3333) and the error is caught silently — no test breakage.

### Module boundary

`apps/web` (`scope:app`) → `@conways-game-of-life/api-client` (`scope:api-client`) is an allowed dependency per `eslint.config.mjs`. ✅

### References

- [Source: docs/planning-artifacts/architecture.md#5.5] — api-client design
- [Source: docs/planning-artifacts/epics.md#Story-7.3] — ACs and effort estimate
- [Source: apps/web/app/page.tsx] — existing reducer, state, sidebar layout

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `SavePatternPanel` extracted as a dedicated component (per project convention); receives all state as props — no internal fetch calls, fully controlled.
- `extractLiveCells` and `gridFromSavedPattern` extracted to `apps/web/app/lib/grid-from-pattern.ts` for testability; 9 unit tests covering empty grid, blinker, out-of-bounds clamping, and round-trip.
- `handleLoad` reuses the existing `place` reducer action (already resets `genCount: 0`) — no new action needed.
- `listPatterns` on mount uses `.catch(() => undefined)` (not `.catch(() => {})`) to avoid `@typescript-eslint/no-empty-function` lint error.
- `apps/web/tsconfig.json` required manual addition of `@conways-game-of-life/api-client` path alias — Nx sync adds the project reference but does not add the `paths` entry to the Next.js tsconfig.
- 9 web tests pass (2 existing page render + 7 new helper unit tests); existing page tests unaffected — `listPatterns` fails silently in jest/jsdom (connection refused, caught).

### File List

- `apps/web/app/components/SavePatternPanel.tsx`
- `apps/web/app/lib/grid-from-pattern.ts`
- `apps/web/app/lib/grid-from-pattern.spec.ts`
- `apps/web/app/page.tsx`
- `apps/web/tsconfig.json`
- `docs/implementation-artifacts/7-3-save-and-load-ui-in-the-web-app.md`
- `docs/implementation-artifacts/sprint-status.yaml`
