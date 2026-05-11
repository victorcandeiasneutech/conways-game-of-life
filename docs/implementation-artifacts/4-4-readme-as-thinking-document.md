# Story 4.4: README as thinking document

Status: review

## Story

As the panel,
I want a README that explains why the architecture looks like it does, what was traded off, how AI was used, what would come next, and what the candidate isn't proud of,
so that I get the "thinking document" the brief requires.

## Acceptance Criteria

1. **Given** the repository root README,
   **When** read top-to-bottom,
   **Then** it contains sections for: one-command local startup; architecture overview (with a link to `docs/planning-artifacts/architecture.md`); module boundaries (with the deliberate-violation demonstration captured in story 1.2); explicit trade-offs and what was deliberately skipped (mirroring architecture §8); AI usage with at least one concrete "AI helped" example and at least one "I pushed back on AI" example (NFR9); "what's next with another 8 hours"; and an honest "what I'm not happy with."

2. **Given** the AI artifact directories,
   **When** the README is reviewed,
   **Then** it confirms `.claude/`, `.cursor/`, `.opencode/`, and `_bmad/` are committed, references their location, and is not gitignored (AR4).

## Tasks / Subtasks

- [x] Rewrite `README.md` as thinking document with all required sections
- [x] Create `START_HERE.md` — interviewer-facing setup guide (one-command startup)
- [x] Fix pre-existing `next.config.js` unused eslint-disable directive (tracked since epic 3 retro)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 4-3 → done, 4-4 → review

## Dev Notes

### README sections and their sources

| Section | Source |
|---|---|
| Quick start | `apps/web/project.json` targets |
| Architecture overview | `docs/planning-artifacts/architecture.md` §1, §4 |
| Module boundaries | `docs/implementation-artifacts/module-boundary-violation-demo.md` |
| Trade-offs and skips | `docs/planning-artifacts/architecture.md` §8 |
| AI usage — rAF ref pattern | Epic 3 retrospective + story 3.3/3.5 dev notes |
| AI usage — null-check miss | Story 4.1 completion notes |
| AI usage — sprint-status error | Epic 3 retro action item #1 |
| AI usage — hasTouch miss | Story 4.3 CI failure |
| What's next | `docs/planning-artifacts/epics.md` epics 5–8 |

### next.config.js lint warning

`eslint-disable-next-line @typescript-eslint/no-var-requires` became unused when the ESLint config stopped reporting `no-var-requires` on `.js` files. Removing the directive clears the warning without changing runtime behavior.

### References

- [Source: docs/planning-artifacts/epics.md#Story-4.4] — ACs
- [Source: docs/planning-artifacts/architecture.md#8] — trade-offs section

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- README replaces assignment brief content with thinking-document content. Original brief survives in `docs/planning-artifacts/`.
- START_HERE.md is the interviewer-facing setup guide — kept intentionally short.
- `next.config.js` eslint-disable removed — rule no longer fires on JS files, directive was pure noise.
- Three "AI was wrong" examples drawn from real CI failures and user corrections: null-check lint (4.1), sprint-status sequencing (3.2), hasTouch (4.3).

### File List

- `README.md`
- `START_HERE.md`
- `apps/web/next.config.js`
- `docs/implementation-artifacts/4-4-readme-as-thinking-document.md`
- `docs/implementation-artifacts/sprint-status.yaml`
