# Conway's Game of Life — Frontend Take-Home

You are a senior frontend engineer. This is a take-home with an unusual shape: **the planning is already done**. The product brief, PRD, architecture, and epic breakdown all live in this repository. Your job is to **execute** against them with discipline, leave a clean trail, and ship.

This mirrors how delivery actually works at Design Pickle. You walk into a project with context already established, you read it, you ask the right questions, you make focused PRs, and the planning artifacts tell you what "done" looks like.

We respect concise. We would rather see four things done well than ten things half-built.

## Contents

- [Submission](#submission)
- [What's already in this repo](#whats-already-in-this-repo)
- [Getting started](#getting-started)
- [How to execute](#how-to-execute)
- [Required deliverables](#required-deliverables)
- [Evaluation criteria](#evaluation-criteria)
- [Things to avoid](#things-to-avoid)
- [Stretch goals — entirely optional](#stretch-goals--entirely-optional)
- [Questions](#questions)
- [Confidentiality and ownership](#confidentiality-and-ownership)

## Submission

- **Fork this repository** to your own GitHub account. Do all work on your fork. We review your fork.
- **Deadline: 7 calendar days** from when you received this brief.
- **All communication routes through Interviewer.** Send questions, status, and your final submission to him. We respond within one business day.

Final submission is one message to Interviewer containing:

- The URL of your fork
- The URL of your Loom walkthrough
- A deployed URL if you hosted the app (welcome but not required)

## What's already in this repo

| Path | Purpose |
| --- | --- |
| `docs/planning-artifacts/product-brief.md` | Vision, target users, strategic posture |
| `docs/planning-artifacts/prd.md` | Functional and non-functional requirements with IDs |
| `docs/planning-artifacts/architecture.md` | Locked technology decisions, module boundaries, default values |
| `docs/project-context.md` | 20 numbered implementation rules for AI agents working in this repo |
| `docs/planning-artifacts/epics.md` | 8 epics, 24 PR-sized stories, MVP and stretch tiers |
| `docs/implementation-artifacts/sprint-status.yaml` | Story tracker — you keep it current |
| `docs/implementation-artifacts/ai-usage.md` | Template for your AI usage report |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template enforcing story link, deviation callout, self-review |
| `_bmad/` | BMAD Method installation (workflows, agents, slash commands) |
| `.claude/`, `.cursor/`, `.opencode/` | AI agent configurations mirrored across editors |

The `_bmad/`, `.claude/`, `.cursor/`, and `.opencode/` directories are evaluation artifacts. **Do not delete them. Do not gitignore them.** They are how we evaluate your AI fluency.

## Getting started

Three steps:

1. **Fork** this repository to your GitHub account.
2. **Read the planning artifacts in this order:**
    1. [Product Brief](docs/planning-artifacts/product-brief.md) — why we are building this
    2. [PRD](docs/planning-artifacts/prd.md) — what good looks like, FR and NFR by ID
    3. [Architecture](docs/planning-artifacts/architecture.md) — locked tech decisions
    4. [Project Context](docs/project-context.md) — read this carefully; it is the operational rulebook for AI agents in this repo
    5. [Epics and Stories](docs/planning-artifacts/epics.md) — implementation sequence
    6. [Sprint Status](docs/implementation-artifacts/sprint-status.yaml) — current state of every story
3. **Open a BMAD agent** in your editor. The repo has BMAD installed for Claude Code, Cursor, and opencode. When unsure what to do next, run `/bmad-bmm-sprint-status` or ask `/bmad-agent-bmad-master`.

You will write `START_HERE.md` at the repo root as one of your deliverables. That document is the interviewer's setup guide for *your* finished project. See the [Required deliverables](#required-deliverables) section.

## How to execute

This repository has the **BMAD Method** installed. Use it. BMAD workflow precision is the top evaluation criterion.

The expected loop, per story:

1. Pick the next story from `docs/implementation-artifacts/sprint-status.yaml`.
2. Run `/bmad-bmm-create-story` (or `/bmad-bmm-quick-dev` for shorter stories) to draft the story file under `docs/implementation-artifacts/`.
3. Implement on a feature branch named after the story key, for example `story/3-5-speed-slider`.
4. Land it as a single PR into `main` on your fork. CI runs lint, typecheck, Jest, and Playwright on every PR — you author this workflow as a deliverable.
5. Update `sprint-status.yaml` so the story moves to `done`.
6. Repeat.

Hard rules from the planning artifacts that bear repeating here:

- **First commit is raw `nx` scaffolding output, untouched.** No edits mixed in. This is how we read what you authored versus what the tool generated.
- **One story = one branch = one PR.** Each commit summarizable in one sentence.
- **No direct pushes to `main`.** Configure branch protection on your fork.
- **Tests land in the same PR as the code they test.** Tests bulk-added at the end to chase coverage are a fail signal, not neutral.

If you deviate from `docs/planning-artifacts/architecture.md` or `docs/project-context.md` — and you may — document the deviation in the relevant PR description and call it out at presentation. Undocumented deviations read as accidents. Documented deviations read as judgment.

When you finish the work, run `/bmad-bmm-retrospective` to generate the retrospective. We read it.

## Required deliverables

1. **Working application on your fork.** Functional MVP per epics 1–4 in `docs/planning-artifacts/epics.md`.
2. **`START_HERE.md` at the repo root.** The interviewer-facing setup guide for your finished project. Tells the interviewer how to clone, install, and run the app from a fresh machine. Ideally one command from clone to running app. If you deployed the app, link it here.
3. **GitHub Actions CI workflow.** Lint, typecheck, Jest, and Playwright on every PR into `main`. Failing checks block merge. You author this — it is part of the evaluation.
4. **Tests.** Unit tests for the simulation core in `libs/sim` covering Conway's four rules, edge cases, and canonical patterns (block, blinker, glider). At least one Playwright E2E covering the happy path: set canvas size, paint cells, play, assert advance. Coverage target is your call; justify it in the PR that establishes it.
5. **AI artifacts kept.** `.claude/`, `.cursor/`, `.opencode/`, and `_bmad/` remain in the repo across the entire build. Substantive use, not throwaway boilerplate. If you used AI without leaving a trace, we lose the ability to evaluate that part of your work. **No traces, no signal.**
6. **`docs/implementation-artifacts/ai-usage.md` filled in.** A template ships in this repo. Fill in each section honestly. The "Three times AI was wrong, and what you did" section is the most signal-rich.
7. **`docs/implementation-artifacts/sprint-status.yaml` reflecting truth.** As stories move from `backlog` to `ready-for-dev` to `in-progress` to `review` to `done`, you update this file.
8. **A 5-minute Loom (or equivalent) walkthrough.** Architecture overview, one or two trade-offs, a piece of AI-assisted work you are proud of, a piece you pushed back on, and one BMAD workflow you used and what it bought you. Keep it tight.

## Evaluation criteria

In priority order:

### 1. BMAD workflow precision (top weight)

We evaluate your process via BMAD artifacts:

- `sprint-status.yaml` is current and reflects reality.
- Story files in `docs/implementation-artifacts/` exist for the stories you implemented.
- A retrospective generated via `/bmad-bmm-retrospective` is committed.
- Stories were implemented in the sequence defined by the epic breakdown.
- When stuck, you used `/bmad-agent-bmad-master` rather than guessing.

We will run `/bmad-bmm-code-review` and `/bmad-bmm-check-implementation-readiness` against your submission as part of the review.

### 2. Git and CI hygiene

- First commit is raw Nx scaffolding output.
- Each commit summarizable in one sentence.
- Each story ships in a single focused PR.
- All four CI checks (lint, typecheck, Jest, Playwright) green at merge.
- Branch protection enabled on your fork's `main`.
- PRs use the template in `.github/PULL_REQUEST_TEMPLATE.md`.

### 3. AI fluency via the AI usage report

We read `docs/implementation-artifacts/ai-usage.md` carefully. The most signal-rich section is the one where you describe AI output you rejected or corrected and what you did instead. Anyone can copy AI output; engineers we want to hire can recognize when it is wrong.

### Also weighted

- **Frontend craft.** Component boundaries, state management, render performance, responsive behavior.
- **Code quality and modularity.** Module boundaries that CI actually enforces, simulation core in a shared library.
- **Test signal.** Tests that constrain behavior, not pad coverage.
- **Judgment.** What you chose to build, what you chose to skip, how clearly you explain why.
- **Communication.** PR descriptions, retrospective, and Loom.

### Architecture deviations

You may deviate from `docs/planning-artifacts/architecture.md` or `docs/project-context.md`. We expect senior engineers to spot things and propose better solutions. Two requirements when you deviate:

1. **Document the deviation in the PR description** at the time you make it.
2. **Call it out during the Loom walkthrough** when presenting your finished work.

Undocumented deviations read as accidents. Documented deviations read as judgment.

## Things to avoid

Direct, so you do not waste time on the wrong things:

- **Tests added in the last hour to hit a coverage number.** We can tell.
- **Framework or library hopping** to demonstrate breadth. The stack is locked in `architecture.md`. Stick to it.
- **AI-generated code committed without review or rationale.** We look for engineers who direct AI, not engineers who paste it.
- **A `START_HERE.md` that is just `npm install`.** It is a setup guide for *your* project. Make it work from a fresh machine.
- **Scope creep.** A polished MVP beats a broken full feature list.
- **"I would have added tests but ran out of time."** Plan accordingly.
- **Deleting or gitignoring `_bmad/`, `.claude/`, `.cursor/`, or `.opencode/`** because they look like tooling noise. They are evaluation deliverables.
- **Pushing directly to `main`** on your fork. Branch protection. PRs. Green checks.
- **Bulk-editing the planning artifacts** to "fix" things. If you disagree with something there, deviate in your implementation and document the deviation. The artifacts are the baseline we evaluate against.

## Stretch goals — entirely optional

Epics 5–8 in `docs/planning-artifacts/epics.md` define stretch tiers: pattern library, performance upgrades (Web Worker plus OffscreenCanvas), pattern persistence (NestJS plus SQLite), pluggable rule sets.

**Stretch goals do not affect your evaluation.** Skipping all of them does not lower your score. Doing them does not compensate for gaps in core deliverables. They exist for engineers who finish the core work and want to play.

## Module boundaries

Nx tag taxonomy and `@nx/enforce-module-boundaries` are configured per architecture §5.6. A deliberate violation was demonstrated to prove the rule fires in CI — see [`docs/implementation-artifacts/module-boundary-violation-demo.md`](docs/implementation-artifacts/module-boundary-violation-demo.md).

The `libs/sim` library has an additional `no-restricted-imports` rule (per architecture R2) that blocks React, Next.js, and NestJS imports at the ESLint level — catching external npm packages that the tag rule alone cannot stop.

## Questions

Reply to Interviewer. We respond within one business day.

## Confidentiality and ownership

Please keep this assessment confidential. Other candidates are working through the same brief.

Your work remains yours. This is a hiring assessment, not contracted delivery.

Good luck.
