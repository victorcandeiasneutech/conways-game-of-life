# Story 3.1: Page shell, canvas size form, and responsive layout

Status: review

## Story

As Casey,
I want to land on a page with a sensible-default empty grid and a width × height form to resize it,
so that I can start interacting within seconds on either desktop or my 375px portrait phone.

## Acceptance Criteria

1. **Given** the page is loaded on a desktop ≥1280px viewport,
   **When** the page renders,
   **Then** the canvas area and all primary controls are visible together with no scrolling.

2. **Given** the page is loaded on a 375px portrait viewport,
   **When** the page renders,
   **Then** controls reflow vertically, the canvas scales to fit the viewport width, and there is
   no horizontal scrollbar.

3. **Given** the canvas size form,
   **When** the user enters a valid width and height within `[5, 100]` and submits,
   **Then** the grid state updates to the new dimensions and the generation counter resets to 0.

4. **Given** the canvas size form,
   **When** the user enters a value outside `[5, 100]` (zero, negative, >100, or non-numeric),
   **Then** the input is rejected with a visible error message and the previous dimensions are
   retained.

5. **Given** the simulation is running,
   **When** the user submits a new canvas size,
   **Then** the simulation pauses and the grid resets (pause + clear — architecture §10 OQ #1,
   locked decision, do not relitigate).

## Tasks / Subtasks

- [x] Install and configure Tailwind CSS (AC: #1, #2)
  - [x] Run `pnpm nx g @nx/next:setup-tailwind web` OR install manually; verify Tailwind classes compile
  - [x] Replace `apps/web/app/global.css` with Tailwind directives + minimal base dark background
- [x] Delete scaffold files (Epic 1 carry-forward debt)
  - [x] Delete `apps/web/app/page.module.css`
  - [x] Delete `apps/web/app/api/hello/route.ts` (scaffold placeholder)
- [x] Implement page state and layout in `apps/web/app/page.tsx` (AC: #1–#5)
  - [x] Add `'use client'` directive
  - [x] State: `grid: Grid`, `running: boolean`, `genCount: number` (useReducer or useState)
  - [x] Default dimensions: 30×30 (`createGrid(30, 30)` from `@conways-game-of-life/sim`)
  - [x] Responsive Tailwind layout: sidebar with controls + main canvas area; reflows to single column at sm:
  - [x] Canvas placeholder `<canvas>` element (rendered dimensions wired to grid; actual drawing is story 3.2)
  - [x] Generation counter rendered as `data-testid="gen-count"` for Playwright (story 4.1)
- [x] Implement `GridSizeForm` component (AC: #3, #4, #5)
  - [x] Create `apps/web/app/components/GridSizeForm.tsx`
  - [x] Inputs: width and height, number type, min=5 max=100
  - [x] Client-side validation: reject if < 5, > 100, or non-integer; show inline error
  - [x] On valid submit: callback updates grid + resets genCount to 0
  - [x] On submit while running: pause simulation then resize + clear
- [x] Update `apps/web/app/layout.tsx` (dark background, metadata)
- [x] Update `apps/web/specs/index.spec.tsx` (or replace) to match new page
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — all green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 3-1 → done

## Dev Notes

### Tailwind Setup

Use `pnpm nx g @nx/next:setup-tailwind web` to add Tailwind. If the generator installs Tailwind v4,
the `global.css` syntax is:
```css
@import "tailwindcss";
```
If it installs Tailwind v3, use:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Verify classes compile by checking a `bg-neutral-950` or `text-cyan-400` rule renders.

Delete the old `page.module.css` and remove the CSS Modules import from `page.tsx` — we are Tailwind-only from this story forward.

### Page Component Shape

`apps/web/app/page.tsx` is the single `'use client'` component owning all state. The architecture
(§4.5) says use `useReducer` for the grid+genCount pair so transitions are atomic. Minimal shape:

```typescript
'use client';
import { useReducer, useState } from 'react';
import { createGrid } from '@conways-game-of-life/sim';
import type { Grid } from '@conways-game-of-life/types';
import GridSizeForm from './components/GridSizeForm';

type State = { grid: Grid; genCount: number };
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'resize':
      return { grid: createGrid(action.w, action.h), genCount: 0 };
    case 'tick':
      return { grid: action.next, genCount: state.genCount + 1 };
  }
}

export default function Page() {
  const [{ grid, genCount }, dispatch] = useReducer(reducer, undefined, () => ({
    grid: createGrid(30, 30),
    genCount: 0,
  }));
  const [running, setRunning] = useState(false);

  function handleResize(w: number, h: number) {
    if (running) setRunning(false); // pause + clear per architecture §10 OQ #1
    dispatch({ type: 'resize', w, h });
  }

  // ...
}
```

**Important:** `createGrid` is imported from `@conways-game-of-life/sim` — the path alias, not a
relative path. Module boundary: `scope:app → scope:sim` is allowed.

### Responsive Layout

Desktop (≥1280px): two-column layout — narrow controls sidebar (w-64) + canvas main area.
Mobile (375px portrait): single column, controls stack above canvas.

Tailwind classes:
```
<div className="flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-neutral-950 text-white">
  <aside className="flex flex-col gap-4 lg:w-64">
    {/* GridSizeForm, controls placeholder */}
  </aside>
  <main className="flex-1 flex items-start justify-center">
    <canvas
      width={grid.width * cellSize}
      height={grid.height * cellSize}
      className="max-w-full"
    />
  </main>
</div>
```

`cellSize` can be derived as `Math.floor(Math.min(availableWidth, availableHeight) / Math.max(grid.width, grid.height))` or set to a fixed value (e.g., 12px) for story 3.1 while canvas drawing lands in 3.2.

### Canvas Placeholder

Story 3.1 must render the `<canvas>` with correct pixel dimensions, but drawing happens in 3.2. The
canvas should have `width={grid.width * CELL_PX}` and `height={grid.height * CELL_PX}` where
`CELL_PX` is a local constant (12 is fine for MVP). Set a visible background via CSS so QA can
confirm it exists: `style={{ background: '#0a0a0a' }}`.

The canvas will need a ref for story 3.2: `const canvasRef = useRef<HTMLCanvasElement>(null)`.
Add it now to avoid churn.

### GridSizeForm Validation Rules

- Min: 5, Max: 100 (project-context rule #17 — locked, do not change)
- Input type `number` with `min={5}` and `max={100}` on the element
- Additional JS validation before dispatch: `Number.isInteger(value) && value >= 5 && value <= 100`
- Show error per field — one `<p>` below each input (or a combined message)
- Error disappears when user starts typing again
- On submit: call `onResize(w, h)` prop; parent handles the state update

```typescript
// apps/web/app/components/GridSizeForm.tsx
'use client';
import { useState } from 'react';

interface Props {
  currentWidth: number;
  currentHeight: number;
  onResize: (w: number, h: number) => void;
}

export default function GridSizeForm({ currentWidth, currentHeight, onResize }: Props) {
  const [w, setW] = useState(String(currentWidth));
  const [h, setH] = useState(String(currentHeight));
  const [error, setError] = useState('');

  function validate(val: string): number | null {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 5 || n > 100) return null;
    return n;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vw = validate(w);
    const vh = validate(h);
    if (vw === null || vh === null) {
      setError('Width and height must be integers between 5 and 100.');
      return;
    }
    setError('');
    onResize(vw, vh);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Width
        <input
          type="number"
          min={5}
          max={100}
          value={w}
          onChange={(e) => { setW(e.target.value); setError(''); }}
          className="rounded bg-neutral-800 px-2 py-1 w-20 text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Height
        <input
          type="number"
          min={5}
          max={100}
          value={h}
          onChange={(e) => { setH(e.target.value); setError(''); }}
          className="rounded bg-neutral-800 px-2 py-1 w-20 text-white"
        />
      </label>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        className="rounded bg-cyan-600 px-3 py-1 text-sm hover:bg-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        Resize
      </button>
    </form>
  );
}
```

### Generation Counter

Render as:
```tsx
<span data-testid="gen-count">{genCount}</span>
```
The `data-testid` is required by Playwright story 4.1 (architecture §7.1). Do not omit it.

### Scaffold Files to Delete

- `apps/web/app/page.module.css` — Tailwind replaces CSS Modules for this app
- `apps/web/app/api/hello/route.ts` — scaffold placeholder, not needed
- `apps/web/app/api/` directory (entire directory — only contained `hello/route.ts`)

### Spec Update

The existing `apps/web/specs/index.spec.tsx` renders `Page` and asserts `baseElement` is truthy.
Update it to also assert the gen-count element exists:

```typescript
it('should render the generation counter', () => {
  const { getByTestId } = render(<Page />);
  expect(getByTestId('gen-count').textContent).toBe('0');
});
```

The existing "should render successfully" test can stay. The page now imports from `@conways-game-of-life/sim` — the test environment must resolve this; Jest module name mapper should already be configured via `tsconfig.base.json` paths. If not, add to jest config:
```
moduleNameMapper: { '@conways-game-of-life/sim': '<rootDir>/../../libs/sim/src/index.ts' }
```

### Module Boundary Check

`apps/web` has `scope:app` tag. It may import `scope:sim`, `scope:ui`, `scope:types`. The import
`import { createGrid } from '@conways-game-of-life/sim'` is allowed. Do NOT import directly from
`libs/sim/src/...` — use the path alias.

### Previous Story Learnings (Epic 2)

- `nx sync` may run automatically when new cross-lib imports are introduced. Let it complete.
- Verify `pnpm nx typecheck web` locally before opening PR (Epic 1 retro action item #2).
- Sprint-status update (`3-1 → done`) belongs in the same PR commit.

### References

- [Source: docs/planning-artifacts/architecture.md#4.6] — Tailwind is the chosen styling solution
- [Source: docs/planning-artifacts/architecture.md#4.5] — `useReducer` for grid+genCount atomic state
- [Source: docs/planning-artifacts/architecture.md#4.3] — Canvas + Uint8Array render strategy
- [Source: docs/planning-artifacts/architecture.md#5.2] — rAF accumulator (story 3.3; do not implement here)
- [Source: docs/planning-artifacts/architecture.md#5.3] — Canvas render (story 3.2; do not implement here)
- [Source: docs/planning-artifacts/architecture.md#7.5] — A11y: real `<button>`, `aria-label`, focus rings
- [Source: docs/planning-artifacts/architecture.md#10] — Canvas-resize mid-run: pause + clear (OQ #1, locked)
- [Source: docs/project-context.md#Rule-17] — Default grid 30×30; bounds [5,100]; default speed 10
- [Source: docs/planning-artifacts/epics.md#Story-3.1] — ACs and user persona (Casey)
- [Source: docs/implementation-artifacts/epic-2-retro-2026-05-10.md#Action-Items] — verify typecheck locally; delete scaffold immediately; sprint-status in same PR

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
