# AI Usage Report

AI was used end-to-end on this project. Planning, architecture, every story implementation, code review, and retrospectives. The primary interface was Claude Code (CLI) with the BMAD methodology installed. Prompts were intentionally terse ("go", "merged", "YOLO", "1") because the BMAD story files and workflow configs carried the context, the human role was to review outputs, own the process gates, and correct mistakes when they surfaced.

## Tools and agents used

**Claude Code (CLI)** was the primary tool throughout the entire build — planning, implementation, code review, and retrospectives all ran inside Claude Code sessions.

**BMAD workflows actually run:**
- `/bmad-bmm-create-prd` — product requirements document
- `/bmad-bmm-create-architecture` — system architecture
- `/bmad-bmm-create-epics-and-stories` — epic and story backlog
- `/bmad-bmm-create-story` — per-story file creation before each implementation
- `/bmad-bmm-dev-story` — story implementation (ran for every story, 8-1 through 8-2 and most prior epics)
- `/bmad-bmm-code-review` — post-implementation code review (ran on 8-1; prior epics also)
- `/bmad-bmm-retrospective` — end-of-epic retrospective (ran after epics 7 and 8)

---

## Three prompts that worked well

### 1. "go"

After switching to the story branch and confirming the story file was ready, a single word — `go` — was enough to trigger the full dev-story workflow. The AI read the story file, identified what already existed, implemented only what was missing, ran `pnpm nx affected -t lint,typecheck,test`, and reported results. Story 8-1 (HighLife rule set) was implemented this way: one file created, one spec written, one export line added, 13 tests passing, all in one shot. The prompt worked because the BMAD story file carried all the context the AI needed — acceptance criteria, dev notes, file list, existing architecture. The prompt was purely a gate release, not an instruction.

### 2. "YOLO MOD" (for retrospectives)

Activating YOLO mode before a retrospective let the AI run the full party-mode team simulation — all agents (Bob the SM, Winston the Architect, Amelia the Dev, Quinn QA, John PM) — without pausing at every template-output checkpoint. The Epic 7 retrospective generated a 230-line document covering Prisma 7 breaking change, pnpm v10 CI gate, injection token pattern wins, branch-discipline misses, and Epic 8 preparation notes — all from reading the four story files. The prompt worked because the workflow already had the structure; YOLO just removed the friction of confirming each section.

### 3. "the task should be setted to done only when the pr is merged"

This was a correction, not a command — but it's the most valuable kind of prompt. The AI had just run the code review workflow and, after all issues were fixed, set the story status to `done`. One sentence from the user reversed two file edits (story file + sprint-status), saved a memory about the correct lifecycle, and changed the AI's behavior for all subsequent stories. The prompt worked because it was specific and immediate — said exactly when it happened, not as a general note. The AI caught it, reverted, and the mistake didn't repeat.

---

## Three times AI was wrong, and what you did

### 1. Story status marked `done` after code review, not after PR merge

After fixing all code review issues on story 8-1, the AI updated the story file to `Status: done` and set `sprint-status.yaml` to `done`. This was wrong — the story wasn't merged yet. The correct lifecycle is `in-progress` → `review` (after implementation) → `done` (only after PR merge). The AI conflated "code review passed" with "done." I corrected it with a single sentence, the AI reverted both files, saved a memory rule, and applied the correct lifecycle from that point forward. This is the kind of mistake that's easy to miss if you're moving fast and just checking commits — the status would have been wrong in the audit trail.

### 2. Branch created after implementation started (recurring, Epics 6 and 7)

Every retrospective flagged "create branch before writing any code" as an action item. In Epics 6 and 7, the AI started writing implementation code before the feature branch existed and had to be corrected mid-session. The correction each time was: "wait, do not create a specific branch for that — create the branch for the next story." The AI understood the rule and could articulate it clearly in retrospectives, but under prompt pressure ("go") it would skip the branch creation and start writing files on whatever branch was current. In Epic 8 the behavior was finally consistent — but only because I was watching for it. The lesson: process gates that require a pause before action are the ones AI is worst at enforcing on itself.

### 3. Prisma 7 breaking change not flagged before install

In story 7-4, the AI ran `pnpm add @prisma/client prisma` without warning that the latest version (Prisma 7) had removed the `url` field from `datasource` — a breaking change that immediately broke the schema. The AI had no signal that this was a high-velocity dependency with a recent major-version release. The fix was to pin to `prisma@^5.22.0`. The cost was a full debugging cycle: schema error, changelog research, downgrade, re-test. The AI should have proposed a pinned install from the start when working against an architecture document written against a specific version. After this, I added "pin the version in story dev notes install commands" as a standing action item.

---

## Where AI was most valuable

The BMAD workflow structure made every story a self-contained, documented unit — story file, implementation, code review, retrospective — with lessons carried forward explicitly. This meant that at any point in the project, the git history plus the `docs/implementation-artifacts/` directory told the complete story of every decision made. The AI was also genuinely fast at pure implementation once the story file had the dev notes: the HighLife rule set (story 8-1), the worker message protocol extension (8-2), and the Prisma contract tests (7-4) were all first-shot implementations that passed lint, typecheck, and tests without iteration.

---

## Where AI was least valuable, or actively harmful

Process discipline was the consistent weak point. The AI knew the rules — branch first, status only on merge, pin major-version deps — but enforced them inconsistently under execution pressure. The retrospective format surfaced these misses clearly (branch discipline appeared in three consecutive retrospectives), but documenting a failure is not the same as preventing it. The AI is better used as an executor of a well-defined task than as a process enforcer; the human has to own the gates.

---

## If you started over, what would you do differently with AI?

I would put explicit, checkboxed process gates at the top of every story task list, create branch, confirm status lifecycle, verify no major-version installs without pinning, and treat them as blockers before saying "go." The AI is reliable once inside a well-scoped implementation task, it's unreliable at the transitions between tasks. Owning the transitions personally and handing off only the implementation would have eliminated most of the corrections made across the eight epics.
