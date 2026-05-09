# Story 1.3: CI Workflow — Lint and Type-Check on Every PR

Status: ready-for-dev

## Story

As the candidate,
I want a GitHub Actions workflow that runs lint and type-check as separate named jobs on every PR into `main`,
so that style and TypeScript regressions cannot merge and the checks are individually visible in the PR's checks tab.

## Acceptance Criteria

1. **Given** `.github/workflows/ci.yml` is configured to trigger on `pull_request` into `main`,
   **When** a PR is opened or updated,
   **Then** the `lint` job runs `pnpm install --frozen-lockfile` followed by `pnpm nx affected -t lint --base=origin/main` and reports a named check status.
   **And** the `typecheck` job runs `pnpm nx affected -t typecheck --base=origin/main` and reports a separate named check status.

2. **Given** a PR introduces a TypeScript error or lint violation,
   **When** CI runs,
   **Then** the corresponding check (`lint` or `typecheck`) fails and the failure is visible in the PR's checks tab with actionable output.

3. **Given** the scaffold-generated `ci.yml` uses a single flat job running `nx run-many`,
   **When** this story lands,
   **Then** that file is replaced with the architecture §4.10 multi-job structure (separate `lint` and `typecheck` jobs at minimum; `test` and `e2e` come in stories 1.4 and 1.5).

## Tasks / Subtasks

- [ ] Replace scaffold `ci.yml` with architecture-compliant multi-job structure (AC: #1, #3)
  - [ ] Set `on: pull_request: branches: [main]` trigger (PRs into main only)
  - [ ] Add shared `install` steps factored into each job (or a reusable `setup` pattern)
  - [ ] Add `lint` job: `pnpm install --frozen-lockfile` → `pnpm nx affected -t lint --base=origin/main`
  - [ ] Add `typecheck` job: `pnpm install --frozen-lockfile` → `pnpm nx affected -t typecheck --base=origin/main`
  - [ ] Remove `nx fix-ci` step (Nx Cloud feature, not applicable here)
  - [ ] Remove Playwright install from shared setup (belongs in the `e2e` job, story 1.5)
- [ ] Verify `fetch-depth: 0` on `actions/checkout` so `nx affected` can compute the merge base (AC: #1)
- [ ] Open PR and confirm both `lint` and `typecheck` checks appear in the PR's checks tab (AC: #1, #2)

## Dev Notes

### What the scaffold generated vs. what architecture requires

The `--ci=github` flag on `create-nx-workspace` produced a single `main` job that:
- Runs `nx run-many -t lint test build typecheck e2e` (ALL targets on ALL projects, not `affected`)
- Installs Playwright upfront unconditionally
- Ends with `nx fix-ci` (an Nx Cloud integration, not relevant here)
- Triggers on `push` to `main` AND any `pull_request` (not scoped to PRs into `main`)

Architecture §4.10 requires:
- **Four separate named jobs** (`lint`, `typecheck`, `test`, `e2e`) — each visible as an individual check in GitHub PR status
- **`affected` commands** with `--base=origin/main` — only run on projects changed by the PR, not everything
- **Scoped trigger**: `pull_request` with `branches: [main]` — not bare `pull_request`
- **No Nx Cloud features** — Nx Cloud is out of scope for this take-home

Story 1.3 replaces the generated file with the correct skeleton. `test` and `e2e` jobs are stubs or absent until stories 1.4 and 1.5.

### Target `ci.yml` structure for story 1.3

```yaml
name: CI

on:
  pull_request:
    branches:
      - main

permissions:
  actions: read
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9.8.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx affected -t lint --base=origin/main

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9.8.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx affected -t typecheck --base=origin/main
```

`test` and `e2e` jobs are added in stories 1.4 and 1.5 respectively.

### Why `fetch-depth: 0`

`pnpm nx affected --base=origin/main` computes the diff between the PR branch and `origin/main`. GitHub Actions' default `fetch-depth: 1` (shallow clone) means `origin/main` may not exist in the local git history, causing `affected` to fall back to running ALL projects. `fetch-depth: 0` ensures a full clone so the base is correctly resolved.

### Why separate jobs instead of steps

Each job produces a distinct named check in the PR's checks tab. Branch protection (story 1.6) requires individual check names (`lint`, `typecheck`, `test`, `e2e`) as required status checks — a single job named `main` cannot be split into required sub-checks via branch protection.

### Why `affected` not `run-many`

`pnpm nx affected -t lint --base=origin/main` only lints projects whose source files changed between the PR branch and `main`. For early stories (before sim/ui code exists), this means only the modified files' projects are checked — fast CI feedback. `nx run-many` runs every project regardless.

### Version pins (from scaffold — do not change)

- pnpm: `9.8.0` (from `pnpm/action-setup@v4` in scaffold)
- Node: `20` (from `actions/setup-node@v4` in scaffold)
- `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`

### References

- [Source: docs/planning-artifacts/architecture.md#4.10] — CI workflow outline, four required jobs
- [Source: docs/planning-artifacts/architecture.md#7.2] — CI workflow detail: commands, job names, `affected` pattern
- [Source: docs/planning-artifacts/epics.md#Story-1.3] — ACs for lint and typecheck jobs
- [Source: docs/project-context.md#5] — CI command shape: `pnpm nx affected -t {lint|typecheck|test} --base=origin/main`
- [Source: .github/workflows/ci.yml] — scaffold-generated file being replaced

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
