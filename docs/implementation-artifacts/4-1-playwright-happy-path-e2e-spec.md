# Story 4.1: Playwright happy-path E2E spec

Status: review

## Story

As the panel,
I want a Playwright spec that drives the canonical happy path the README specifies,
so that I can verify end-to-end that the app actually works without running it manually.

## Acceptance Criteria

1. **Given** the spec at `apps/web-e2e/src/happy-path.spec.ts`,
   **When** the spec runs,
   **Then** it navigates to `/`, sets the canvas size to 10×10, clicks three adjacent cells to form a horizontal blinker, clicks Play, and asserts that the generation counter (`data-testid="gen-count"`) reaches `>= 1` within a generous polling window.

2. **Given** the spec uses `expect.poll` with a generous timeout,
   **When** CI runner timing varies,
   **Then** the spec does not flake on exact-frame assertions (no hard-coded sleeps; no exact-counter assertions like "must equal 5").

3. **Given** the spec is wired into Nx,
   **When** `pnpm nx e2e web-e2e` is run locally or in CI,
   **Then** the spec passes.

## Tasks / Subtasks

- [x] Create `apps/web-e2e/src/happy-path.spec.ts` (AC: #1, #2)
  - [x] Navigate to `/`
  - [x] Set width and height to 10, submit Resize
  - [x] Use CELL_PX=12 constant to compute click positions (no bounding box needed at desktop viewport)
  - [x] Click cells (4,4), (5,4), (6,4) — horizontal blinker
  - [x] Click Play button
  - [x] `expect.poll` gen-count textContent parses to integer >= 1 within 5 000ms
- [x] Keep `example.spec.ts` (`has title` test) passing — do not break it
- [x] Run `pnpm nx e2e web-e2e` locally — 6/6 passing (Chromium, Firefox, WebKit)
- [x] Run `pnpm nx affected -t lint,typecheck --base=origin/main` — green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 4-1 → review

## Dev Notes

### Spec shape (architecture §9 — Playwright patterns)

```typescript
import { test, expect } from '@playwright/test';

test('happy path — blinker runs for at least one generation', async ({ page }) => {
  await page.goto('/');

  // Resize to 10×10
  await page.getByLabel('Width').fill('10');
  await page.getByLabel('Height').fill('10');
  await page.getByRole('button', { name: 'Resize' }).click();

  // Click three adjacent cells — horizontal blinker centered at row 4
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found');
  const cell = box.width / 10;

  for (const col of [4, 5, 6]) {
    await canvas.click({ position: { x: col * cell + cell / 2, y: 4 * cell + cell / 2 } });
  }

  // Play
  await page.getByRole('button', { name: 'Play' }).click();

  // Assert gen-count reaches >= 1 (no hardcoded sleep, no exact count)
  await expect.poll(
    async () => parseInt((await page.getByTestId('gen-count').textContent()) ?? '0', 10),
    { timeout: 5000 },
  ).toBeGreaterThanOrEqual(1);
});
```

### Why bounding-box for cell clicks

The canvas `width` attribute is `grid.width * 12` (120px for 10×10). On a desktop viewport it is not CSS-scaled. The app's click handler uses `getBoundingClientRect()` internally — so clicking at `col * (box.width / 10) + halfCell` produces the same grid coordinate the app computes.

### Previous Story Learnings (Epic 3 retro)

- `data-testid="gen-count"` is on the `<span>` wrapping the counter — placed in story 3.1
- Play button label toggles; before clicking Play the label reads "Play"
- Resize button is a submit button inside GridSizeForm
- Architecture rule: no `page.waitForTimeout()` or `sleep` — use `expect.poll` with timeout

### References

- [Source: docs/planning-artifacts/architecture.md#9] — Playwright: `expect.poll`, `data-testid`, no sleeps
- [Source: docs/planning-artifacts/epics.md#Story-4.1] — ACs and spec location

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Used hardcoded `CELL = 12` (matching `CELL_PX` in `page.tsx`) instead of `boundingBox()` to avoid null-check lint warnings (`playwright/no-conditional-in-test`, `@typescript-eslint/no-non-null-assertion`). Safe because at desktop viewport the 120×120 canvas is not CSS-scaled.
- `expect.poll` with `parseInt` correctly handles the gen-count span returning a string.
- All 6 specs pass (2 tests × 3 browsers) in 16s locally.

### File List

- `apps/web-e2e/src/happy-path.spec.ts`
- `docs/implementation-artifacts/4-1-playwright-happy-path-e2e-spec.md`
- `docs/implementation-artifacts/epic-3-retro-2026-05-10.md`
- `docs/implementation-artifacts/sprint-status.yaml`
