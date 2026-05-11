# Conway's Game of Life

A full-stack take-home built with Next.js, Nx, Jest, and Playwright. This document is the thinking document — architecture rationale, trade-offs, AI usage (with real misses), what's next, and what I'm not happy with.

The original assignment brief is preserved in [`docs/planning-artifacts/`](docs/planning-artifacts/).

---

## Quick start

```bash
# Clone and install
git clone https://github.com/victorcandeiasneutech/conways-game-of-life.git
cd conways-game-of-life
pnpm install

# Run the app
pnpm nx dev web
# → http://localhost:3000

# Run unit tests
pnpm nx test sim

# Run all checks (lint + typecheck + jest)
pnpm nx run-many -t lint,typecheck,test

# Run Playwright E2E (starts dev server automatically)
pnpm nx e2e web-e2e
```

For a complete setup guide from a fresh machine, see [START_HERE.md](START_HERE.md).

---

## Architecture

Full decision record: [`docs/planning-artifacts/architecture.md`](docs/planning-artifacts/architecture.md).

The core structure:

```
libs/
  types/   — shared TypeScript interfaces (Grid, Cell) — no runtime deps
  sim/     — pure Conway rules engine (step, toggleCell, createGrid, etc.)
apps/
  web/     — Next.js app, Canvas render, useReducer state, rAF loop
```

**Why Canvas, not DOM cells.** The PRD targets 50×50 at ≥30 gen/sec as MVP and 200×200 at 60fps as stretch. A `React.memo` per-cell approach survives MVP but dies approaching 100×100. Canvas with a flat `Uint8Array` grid is the only choice with a clean upgrade path to the stretch budget (Web Worker + OffscreenCanvas). There's no mid-build strategy switch this way.

**Why `useReducer`, not Zustand/Jotai.** The state surface is entirely page-scoped: one grid, one generation counter, one running flag, one speed value. Installing a store for one component's state is over-engineering that reads as poor judgment to the panel.

**Why the rAF + time accumulator loop.** `setInterval` drifts under tab throttling and can't run faster than ~60fps. The accumulator pattern (`accumulatorRef += dt; while (acc >= tickInterval) { step(); acc -= tickInterval }`) means the speed slider takes effect mid-run without restarting the loop — the next frame just reads the new `genPerSecRef.current`.

**Why `useRef` for both `genPerSec` and `step` inside the loop.** The loop's `useEffect` only re-fires when `running` changes. If `genPerSec` or `step` were captured in the closure directly, they'd go stale. Both are written into refs on every render (`genPerSecRef.current = opts.genPerSec`) and read inside the rAF callback, so they're always current without triggering a loop restart.

---

## Module boundaries

`@nx/enforce-module-boundaries` (Nx tag rule) + `no-restricted-imports` (ESLint rule in `libs/sim`) create a two-layer boundary:

| Tag | Allowed to depend on |
|---|---|
| `scope:sim` | `scope:types` only |
| `scope:app` | any lib |
| `scope:types` | nothing |

The sim library additionally bans `react`, `next`, and `@nestjs/*` via `no-restricted-imports` — the tag rule catches Nx lib boundary violations, but can't see external npm packages.

**The boundary fires.** During story 1.2, a `import * as React from 'react'` was added to `libs/sim/src/index.ts` on a throwaway branch and `pnpm nx lint sim` was run. Output:

```
error  'react' import is restricted from being used by a pattern  no-restricted-imports
```

Full capture: [`docs/implementation-artifacts/module-boundary-violation-demo.md`](docs/implementation-artifacts/module-boundary-violation-demo.md).

---

## Trade-offs and deliberate skips

These mirror architecture §8.

**Canvas hit-testing is manual.** `onPointerDown` computes the grid cell from `getBoundingClientRect()` + `scaleX/Y`. This is ~8 lines of arithmetic that DOM event delegation would make automatic. The cost was worth it for the performance win.

**No external state store.** `useState`/`useReducer` handles all page state. If the stretch surface (save/load, pattern library) explodes, the right move is React Context with `useReducer`, not bolting on Zustand. Accepted the refactor risk to keep the MVP readable.

**Stretch epics 5–8 explicitly skipped.** Pattern library (epic 5), Web Worker + OffscreenCanvas (epic 6), NestJS persistence (epic 7), and pluggable rule sets (epic 8) are defined in the planning artifacts but not implemented. The architecture is designed for them — `libs/types` defines `PatternRepository`, the sim is already pure and `ArrayBuffer`-compatible — but none were attempted. A polished MVP beats a broken full feature list.

**No `libs/ui` component library.** The architecture scaffolds it, but every UI component in the MVP is page-local. Extracting to a shared lib before there are two apps to share it between is premature. The scaffold (empty barrel + tag config) exists; the components stayed inline.

**`next.config.js` carried a stale `eslint-disable` comment for four epics.** The Nx-generated `eslint-disable-next-line @typescript-eslint/no-var-requires` directive became unused when the ESLint config stopped reporting on `.js` files. It was a zero-impact carry-forward, but it was noise in every lint run. Cleaned up in story 4.4.

---

## AI usage

This project was built using Claude Code with the BMAD Method v6.0.2 installed. Every story went through `/bmad-bmm-create-story` → `/bmad-bmm-dev-story` → `/bmad-bmm-code-review`. The AI artifact directories (`.claude/`, `.cursor/`, `.opencode/`, `_bmad/`) are committed and not gitignored — they are evaluation artifacts, not throwaway tooling.

### Where AI was right and I shipped it

**The rAF accumulator hook design.** When implementing story 3.3 (Play/Pause/Step), I asked for a loop design that would survive the speed slider story (3.5) without modification. The AI proposed `useSimulationLoop` with both `genPerSec` and `step` read through refs rather than captured in the closure — explicitly noting that this let the speed change take effect next frame without restarting the loop. Story 3.5 required exactly one change to `page.tsx`: promoting a `const` to `useState`. The hook was never touched. That was the right call, and I wouldn't have gotten there as cleanly without it.

**The `gridRef` pattern for stale closure avoidance.** `handleTick` dispatches `{type: 'tick', next: step(gridRef.current)}`. Wrapping it in `useCallback([])` is only safe because `gridRef.current = grid` is updated on every render before the callback fires. The AI identified this pattern immediately and explained why `useCallback` with the grid as a dep would either cause loop restarts (dep in effect) or go stale (dep missing). The explanation was accurate.

### Where AI was wrong and I corrected it

**Playwright null-check lint conflict.** The first Playwright spec used `const box = await canvas.boundingBox(); if (!box) throw new Error(...)`. The AI then suggested replacing it with `expect(box).not.toBeNull()` followed by `box!` (non-null assertion). That triggered `@typescript-eslint/no-non-null-assertion`. The correct fix was to remove the bounding box entirely and use the known `CELL_PX = 12` constant — the canvas is 120×120px at desktop viewport, no CSS scaling occurs. I rejected two AI suggestions before arriving at the right answer, which was to question whether the bounding box measurement was needed at all.

**Sprint-status `done` before PR merge.** In story 3.2, the AI set sprint-status to `done` in the feature branch commit. I caught it immediately — `done` only happens after the PR merges on `main`. The correct rule: `review` on the feature branch, `done` at the start of the next story's setup. Applied correctly in every story after 3.2. The AI following a wrong pattern without flagging it is the exact thing this section is for.

**`hasTouch` missing from responsive spec.** The story 4.3 spec used `page.setViewportSize({ width: 375, height: 667 })` to simulate mobile. CI failed on WebKit: "The page does not support tap. Use hasTouch context option to enable touch support." `setViewportSize` only changes pixel dimensions — touch capability is a browser context option, not a viewport property. The fix was `test.use({ viewport: { width: 375, height: 667 }, hasTouch: true })`. The AI's first implementation didn't know this distinction; CI caught it.

---

## What's next with another 8 hours

Epics 5–8 are fully specced in [`docs/planning-artifacts/epics.md`](docs/planning-artifacts/epics.md). Priority order:

1. **Pattern library (epic 5, ~2h).** `placePattern(grid, pattern, origin)` in `libs/sim`, a preset dropdown in the UI. The sim is already pure — this is additive with no rework.
2. **Web Worker + OffscreenCanvas (epic 6, ~3h).** `step()` moves to a worker with transferable `ArrayBuffer` — the sim is already array-based and framework-free, so the worker boundary is one thin adapter. This unlocks the 200×200 @ 60fps stretch budget.
3. **NestJS save/load (epic 7, ~2h).** The architecture already defines `PatternRepository` and `libs/api-client`. The seam exists — it just needs the NestJS app and the in-memory repository wired up. SQLite via Prisma is optional on top of that.
4. **Pluggable rule sets (epic 8, ~1h).** `RuleSet` interface in `libs/sim`, HighLife as the second implementation, a dropdown in the UI. The sim's `step()` function is already parameterized for this.

---

## What I'm not happy with

**The `next.config.js` lint warning lived for four epics.** I noticed it in story 3.1 and deferred it to "story 4.4 cleanup." That was correct in terms of story discipline — don't make drive-by changes — but carrying a known warning across 12 PRs was avoidable. A two-line fix in the PR that introduced the warning would have been the right call.

**No integration test between `libs/sim` and the React reducer.** Every sim function is unit-tested in isolation. The reducer actions (`tick`, `toggle`, `resize`) are tested implicitly through the web app's Jest suite, which renders the full page component. There's no focused test that says "given reducer state X, action Y produces state Z without the full component tree." Not a gap that caused bugs, but a gap in the test architecture.

**The gen-count span is nested inside a sentence.** `Generation: <span data-testid="gen-count">0</span>` — the span is a text node inside a prose span. It works, but the accessibility story is better if the generation counter is a labeled region. The Playwright spec targets it correctly; the semantic markup could be cleaner.

---

## AI artifact directories

| Directory | Purpose |
|---|---|
| `_bmad/` | BMAD Method v6.0.2 — workflows, agents, tasks, templates |
| `.claude/` | Claude Code slash commands (43 BMAD commands) |
| `.cursor/` | Same command set mirrored for Cursor |
| `.opencode/` | Same command set mirrored for opencode |

All four are committed to the repository and not gitignored. They are evaluation artifacts.
