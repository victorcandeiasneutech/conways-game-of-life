# Story 1.6: Branch Protection and Auto-Approve Workflow

Status: ready-for-dev

## Story

As the candidate,
I want `main` protected with the four required checks plus an auto-approve workflow that fires on every PR,
so that AR2 (branch protection) and AR3 (auto-approve) are demonstrably satisfied per the brief.

## Acceptance Criteria

1. **Given** repository settings for `main`,
   **When** branch protection is configured,
   **Then** the four CI checks (`lint`, `typecheck`, `test`, `e2e`) are listed as required status checks, at least one approving review is required, direct pushes are blocked, and the settings are documented under `docs/implementation-artifacts/branch-protection-settings.md`.

2. **Given** `.github/workflows/auto-approve.yml` is configured,
   **When** a PR is opened or updated and the auto-approve workflow runs,
   **Then** the workflow posts an approving review from `github-actions[bot]` using `hmarr/auto-approve-action@v4`.
   **And** the PR is only mergeable once both the auto-approval AND all four required checks are green (branch protection enforces this).

3. **Given** a PR has at least one failing check,
   **When** the auto-approve workflow runs,
   **Then** the auto-approval is present but branch protection still blocks merge until all checks pass.

## Tasks / Subtasks

- [ ] Author `.github/workflows/auto-approve.yml` (AC: #2)
  - [ ] Trigger on `pull_request` into `main`
  - [ ] Grant `pull-requests: write` permission
  - [ ] Use `hmarr/auto-approve-action@v4` with `GITHUB_TOKEN`
- [ ] Configure branch protection on `main` via GitHub repository settings (AC: #1)
  - [ ] Require pull request before merging (no direct pushes)
  - [ ] Require 1 approving review
  - [ ] Require status checks: `lint`, `typecheck`, `test`, `e2e`
  - [ ] Require branches to be up to date before merging
  - [ ] Block force pushes
- [ ] Document the branch protection settings in `docs/implementation-artifacts/branch-protection-settings.md` (AC: #1)
- [ ] Open PR and confirm: auto-approve fires, all 4 checks appear as required, PR is mergeable only when all are green (AC: #2, #3)

## Dev Notes

### `auto-approve.yml` — exact file to create

```yaml
name: Auto Approve

on:
  pull_request:
    branches:
      - main

permissions:
  pull-requests: write

jobs:
  auto-approve:
    runs-on: ubuntu-latest
    steps:
      - uses: hmarr/auto-approve-action@v4
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### How auto-approve + branch protection work together

The auto-approve workflow posts an approval immediately when a PR targets `main`. Branch protection requires **both**:
- 1 approving review (satisfied by the auto-approve)
- All 4 checks passing (`lint`, `typecheck`, `test`, `e2e`)

A PR with a failing check gets the auto-approval but cannot be merged — the branch protection gate still holds. This achieves the architecture's intent: "the PR shows the auto-approval and is mergeable per branch-protection rules" only when all checks are green.

The architecture specifies "conditioned on the four required checks all having `conclusion === 'success'`" — this is enforced at the branch protection layer, not at the workflow trigger level. The workflow trigger approach (`pull_request`) is the canonical, maintainable implementation with `hmarr/auto-approve-action@v4`.

### Branch protection settings (GitHub UI — `Settings → Branches → Add rule`)

| Setting | Value |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ enabled |
| Required number of approvals | `1` |
| Require status checks to pass before merging | ✅ enabled |
| Required status checks | `lint`, `typecheck`, `test`, `e2e` |
| Require branches to be up to date | ✅ enabled |
| Do not allow bypassing the above settings | ✅ enabled |
| Allow force pushes | ❌ disabled |
| Allow deletions | ❌ disabled |

**Note on required check names:** The check names must match exactly the `jobs:` keys in `ci.yml` — `lint`, `typecheck`, `test`, `e2e`. GitHub populates these in the branch protection dropdown after the CI workflow has run at least once on a PR.

### `hmarr/auto-approve-action@v4` permissions

The action needs `pull-requests: write` to post a review. This is granted in the `permissions` block of the workflow. The `GITHUB_TOKEN` is automatically available in every GitHub Actions run — no additional secrets needed.

### References

- [Source: docs/planning-artifacts/architecture.md#4.10] — `auto-approve.yml` with `hmarr/auto-approve-action@v4`, branch protection requirements
- [Source: docs/planning-artifacts/epics.md#Story-1.6] — ACs for branch protection + auto-approve
- [Source: docs/project-context.md#3-rule-2] — "All work flows through PRs into main. Branch protection requires the four CI checks plus one approving review."
- [Source: README.md#evaluation-criteria] — AR2 and AR3 are evaluated deliverables
- [Source: .github/workflows/ci.yml] — Job names (`lint`, `typecheck`, `test`, `e2e`) that branch protection requires

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
