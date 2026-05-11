# Story 3.5: Speed slider with rAF + accumulator (mid-run change without restart)

Status: review

## Story

As Casey,
I want to drag the generations-per-second slider while the simulation is running and have the new rate take effect on the next tick,
so that I never have to pause and resume just to change speed.

## Acceptance Criteria

1. **Given** the simulation loop is implemented as a `useSimulationLoop` hook driven by `requestAnimationFrame` plus a time accumulator per architecture §5.2,
   **When** `genPerSec` changes,
   **Then** the change is read fresh each frame via a `useRef` (not via a `useEffect` dependency), so the rAF loop is not torn down and rebuilt.

2. **Given** the slider is rendered with bounds 1–60 gen/sec and default 10,
   **When** the user drags from one rate to another while the simulation is running,
   **Then** the next advanced generation occurs at the new rate without any visible pause, restart, or counter discontinuity.

3. **Given** the slider is keyboard-focused,
   **When** the user presses Arrow Left or Arrow Right,
   **Then** the rate changes by one gen/sec per keypress.

4. **Given** the slider label,
   **When** the page renders,
   **Then** the current gen/sec value is visible next to the slider.

## Tasks / Subtasks

- [x] Promote `DEFAULT_GEN_PER_SEC` to `useState(10)` in `Page` (AC: #1, #2)
- [x] Pass `genPerSec` state to `useSimulationLoop` — already wired via `genPerSecRef`, no hook change needed (AC: #1)
- [x] Add `<input type="range">` slider (AC: #2, #3)
  - [x] `min={1}` `max={60}` `step={1}`
  - [x] `onChange` → `setGenPerSec(Number(e.target.value))`
  - [x] `aria-label="Speed (gen/sec)"`
- [x] Display current `genPerSec` value next to the slider label (AC: #4)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — all green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 3-5 → review

## Dev Notes

### Why no hook change is needed

`useSimulationLoop` already reads `genPerSec` through `genPerSecRef.current` every frame, and the `useEffect` depends only on `opts.running`. Changing `genPerSec` state in the page re-renders the page, which updates `genPerSecRef.current = opts.genPerSec` on the next render — the rAF loop picks it up on the very next frame. No teardown, no restart.

### Slider JSX

```tsx
<div className="flex flex-col gap-1">
  <label className="text-sm text-neutral-400">
    Speed: <span className="text-white font-mono">{genPerSec}</span> gen/sec
  </label>
  <input
    type="range"
    min={1}
    max={60}
    step={1}
    value={genPerSec}
    onChange={(e) => setGenPerSec(Number(e.target.value))}
    aria-label="Speed (gen/sec)"
    className="w-full accent-cyan-400"
  />
</div>
```

### Previous Story Learnings (Story 3.4)

- `useSimulationLoop` already designed for dynamic `genPerSec` — only the state promotion is needed in page.tsx
- `DEFAULT_GEN_PER_SEC` const can be removed after promoting to state

### References

- [Source: docs/planning-artifacts/architecture.md#5.2] — rAF + accumulator, `genPerSecRef` read-fresh-per-frame pattern
- [Source: docs/planning-artifacts/epics.md#Story-3.5] — ACs and FR8 coverage (explicit defeat of PRD R7)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Zero changes to `useSimulationLoop` — the hook already read `genPerSec` through a ref each frame. Promoting to `useState` in the page was the entire change.
- Removed the `DEFAULT_GEN_PER_SEC` module const; initial state value `10` lives inline in `useState(10)`.
- Slider uses controlled `value={genPerSec}` so the display label and thumb stay in sync.

### File List

- `apps/web/app/page.tsx`
- `docs/implementation-artifacts/3-5-speed-slider-with-raf-accumulator-mid-run-change-without-restart.md`
- `docs/implementation-artifacts/sprint-status.yaml`
