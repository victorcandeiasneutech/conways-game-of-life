# Story 8.2: Rule-set selector in the web app

Status: in-progress

## Story

As a user of the simulation,
I want a rule-set selector dropdown in the sidebar,
So that I can switch between Conway's Life and HighLife without reloading the page.

## Acceptance Criteria

1. **Given** the sidebar UI,
   **When** the page loads,
   **Then** a "Rule Set" dropdown shows "Conway's Life" selected by default, with "HighLife" as a second option.

2. **Given** the simulation is running or paused,
   **When** the user selects a different rule set,
   **Then** the simulation switches to the new rule immediately and the grid and generation counter are NOT reset.

3. **Given** the Web Worker runs the simulation loop,
   **When** the rule set changes,
   **Then** the worker receives a `setRuleSet` message and applies the corresponding step function; the main thread uses the same rule set for manual Step clicks.

4. **Given** only two rule sets exist,
   **When** the dropdown is rendered,
   **Then** only `conwayRules` and `highLifeRules` are shown (no free-form input).

## Tasks / Subtasks

- [x] Create this story file (prep)
- [x] Update `apps/web/app/workers/sim.worker.ts`: add `setRuleSet` message type, `activeStep` variable defaulting to `conwayRules.step`, switch on rule id (AC: 3)
- [x] Update `apps/web/app/page.tsx`: add `ruleSetId` state, `RULE_SETS` constant, `useEffect` to post `setRuleSet` to worker, update `handleStepClick` to use active rule's step, add rule-set dropdown UI in sidebar (AC: 1, 2, 4)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1–4)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 8-2 → review

## Dev Notes

### Worker message protocol extension

Add `setRuleSet` to `WorkerMessage` union:

```typescript
type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; cellPx: number }
  | { type: 'tick'; buffer: ArrayBuffer; width: number; height: number }
  | { type: 'render'; buffer: ArrayBuffer; width: number; height: number }
  | { type: 'setRuleSet'; id: string };
```

Functions cannot be transferred via `postMessage` — pass an ID string and map inside the worker.

### No grid reset on rule set change

Switching rule sets is a behavioural change only — same grid state, same gen counter. The `dispatch` call is NOT triggered. Only the active step function reference changes.

### handleStepClick must use same rule as worker

When the user clicks Step while paused, it runs one generation on the main thread synchronously. This must use the same rule set as the worker to stay consistent.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `apps/web/app/workers/sim.worker.ts`
- `apps/web/app/page.tsx`
- `docs/implementation-artifacts/8-2-rule-set-selector-in-the-web-app.md`
- `docs/implementation-artifacts/sprint-status.yaml`
