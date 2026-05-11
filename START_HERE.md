# Start Here

Setup guide for reviewers. Tested on macOS (Node 20, pnpm 9).

## Prerequisites

- **Node 20+** — `node --version`
- **pnpm 9+** — `npm install -g pnpm` if not installed

## Clone and install

```bash
git clone https://github.com/victorcandeiasneutech/conways-game-of-life.git
cd conways-game-of-life
pnpm install
```

## Run the app

```bash
pnpm nx dev web
```

Open [http://localhost:3000](http://localhost:3000).

## Run unit tests

```bash
pnpm nx test sim
```

## Run all CI checks locally

```bash
pnpm nx run-many -t lint,typecheck,test
```

## Run Playwright E2E

```bash
pnpm nx e2e web-e2e
```

Playwright starts the dev server automatically. First run installs browsers (~500 MB).

## Run a single story's checks (faster during review)

```bash
pnpm nx affected -t lint,typecheck,test --base=origin/main
```

## Project layout

```
apps/
  web/          — Next.js app (Canvas render, rAF loop, controls)
  web-e2e/      — Playwright specs
libs/
  sim/          — Pure Conway rules engine (Jest unit tests)
  types/        — Shared TypeScript interfaces
docs/
  planning-artifacts/       — PRD, architecture, epics
  implementation-artifacts/ — Story files, retros, sprint-status
_bmad/          — BMAD Method workflows (evaluation artifact)
.claude/        — Claude Code commands (evaluation artifact)
```

See [README.md](README.md) for architecture rationale, trade-offs, and AI usage.
