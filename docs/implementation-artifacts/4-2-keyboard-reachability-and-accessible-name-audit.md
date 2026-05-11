# Story 4.2: Keyboard reachability and accessible-name audit

Status: review

## Story

As the panel,
I want every interactive control reachable and operable by keyboard with a visible focus ring,
so that the app meets baseline keyboard accessibility and I can verify it without a mouse.

## Acceptance Criteria

1. **Given** a sighted keyboard user tabs through the page,
   **When** focus lands on any interactive control (Play/Pause, Step, Clear, Randomize, Speed slider, Width input, Height input, Resize button),
   **Then** a visible `focus-visible` ring (`ring-2 ring-cyan-400`) appears on that element.

2. **Given** the Speed slider (`<input type="range">`),
   **When** inspected by an AT or audited via Playwright,
   **Then** it exposes `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` in addition to its existing `aria-label="Speed (gen/sec)"`.

3. **Given** all controls already have correct accessible names via button text or label associations,
   **When** the audit runs,
   **Then** no accessible-name gaps are found and no existing functionality is broken.

## Tasks / Subtasks

- [x] Add `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none` to Play/Pause button (`apps/web/app/page.tsx`)
- [x] Add `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none` to Step button
- [x] Add `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none` to Clear button
- [x] Add `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none` to Randomize button
- [x] Add `aria-valuemin={1}` `aria-valuemax={60}` `aria-valuenow={genPerSec}` to Speed slider
- [x] Verify `GridSizeForm.tsx` Resize button already has focus ring — no change needed
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 4-2 → review

## Dev Notes

### Focus ring pattern (consistent with GridSizeForm.tsx)

`GridSizeForm.tsx` already uses `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none` on its Resize button. All buttons in `page.tsx` must use the identical pattern for visual consistency.

`focus-visible` (not `focus`) ensures the ring only shows for keyboard navigation, not mouse clicks — correct UX for sighted users.

### ARIA range attributes

The HTML spec recommends `aria-valuemin`, `aria-valuemax`, `aria-valuenow` on range inputs even though browsers may infer them from `min`/`max`/`value`. Explicit attributes ensure AT compatibility and satisfy accessibility linters.

### Accessible names already present (no gaps)

| Control | Name source |
|---|---|
| Play/Pause | Button text content |
| Step | Button text content |
| Clear | Button text content |
| Randomize | Button text content |
| Speed slider | `aria-label="Speed (gen/sec)"` |
| Width input | `<label>Width</label>` association |
| Height input | `<label>Height</label>` association |
| Resize | Button text content |

### References

- [Source: docs/planning-artifacts/architecture.md] — accessibility baseline
- [Source: docs/implementation-artifacts/epic-3-retro-2026-05-10.md] — known gaps identified

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Focus ring pattern copied exactly from `GridSizeForm.tsx` for visual consistency.
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` added explicitly — browsers infer them but AT tools are more reliable with explicit attrs.
- All 4 buttons in `page.tsx` updated; `GridSizeForm.tsx` Resize button was already correct.

### File List

- `apps/web/app/page.tsx`
- `docs/implementation-artifacts/4-2-keyboard-reachability-and-accessible-name-audit.md`
- `docs/implementation-artifacts/sprint-status.yaml`
