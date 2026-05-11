# Story 4.3: Responsive verification at 375px portrait

Status: review

## Story

As a mobile user,
I want a Playwright spec that asserts the app is usable at 375px portrait,
so that NFR1 has a real, repeatable verification rather than a one-time manual check.

## Acceptance Criteria

1. **Given** a Playwright spec configured with a 375×667 viewport,
   **When** the spec navigates to `/`,
   **Then** it asserts no horizontal scrollbar (`document.documentElement.scrollWidth <= viewport width`).
   **And** it asserts the canvas, controls, and gen counter are visible.

2. **Given** the same spec,
   **When** the user taps a cell on the canvas,
   **Then** the cell toggles alive (verifies touch handler parity with mouse) — confirmed by gen-count reaching >= 1 after Play.

## Tasks / Subtasks

- [x] Create `apps/web-e2e/src/responsive-375px.spec.ts` (AC: #1, #2)
  - [x] `page.setViewportSize({ width: 375, height: 667 })`
  - [x] Assert `document.documentElement.scrollWidth <= 375`
  - [x] Assert canvas, gen-count, and Play button are visible
  - [x] Resize grid to 10×10, tap blinker cells via `canvas.tap()`
  - [x] Click Play, `expect.poll` gen-count >= 1 within 5 000ms
- [x] Run `pnpm nx affected -t lint,typecheck --base=origin/main` — green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 4-2 → done, 4-3 → review

## Dev Notes

### Viewport and touch context via `test.use()`

`test.use({ viewport: { width: 375, height: 667 }, hasTouch: true })` at the file level configures the browser context for all tests in the spec — viewport and touch support together. `setViewportSize()` alone doesn't enable touch; `hasTouch: true` is required for `locator.tap()` to work in non-mobile browser projects (Chromium, Firefox, WebKit).

### Horizontal scroll assertion

`document.documentElement.scrollWidth` returns the total scrollable width. At 375px with a 30×30 grid, the canvas is 360px wide and fits without overflow. The flex-col layout (active below `lg:` = 1024px breakpoint) stacks sidebar above canvas — no element should exceed 375px with the `max-w-full` canvas constraint.

### Touch parity via `locator.tap()`

The app's canvas uses `onPointerDown` for cell toggle. Playwright's `locator.tap()` dispatches a pointer event sequence (pointerdown → pointerup) derived from a touch simulation. This is the canonical way to verify pointer-event handlers respond to touch in Playwright — no `touchscreen` API needed.

### CELL constant

Same `CELL = 12` constant as `happy-path.spec.ts` — canvas resized to 10×10 (120×120px), same blinker at cols 4, 5, 6 row 4.

### References

- [Source: docs/planning-artifacts/epics.md#Story-4.3] — ACs
- [Source: docs/planning-artifacts/architecture.md] — NFR1: responsive layout

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `test.use({ viewport, hasTouch: true })` sets both viewport and touch at context level — `setViewportSize()` alone doesn't enable `locator.tap()` (WebKit error: "page does not support tap").
- `locator.tap()` on canvas triggers `onPointerDown` — Playwright emits pointer events from touch gestures when `hasTouch: true`.
- scrollWidth assertion checked after page load with default 30×30 grid — 360px canvas < 375px viewport, no overflow.

### File List

- `apps/web-e2e/src/responsive-375px.spec.ts`
- `docs/implementation-artifacts/4-3-responsive-verification-at-375px-portrait.md`
- `docs/implementation-artifacts/sprint-status.yaml`
