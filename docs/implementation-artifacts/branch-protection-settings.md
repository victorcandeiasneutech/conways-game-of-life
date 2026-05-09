# Branch Protection Settings — `main`

Configured via: **GitHub → Repository Settings → Branches → Add rule**

## Rule: `main`

| Setting | Value |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ enabled |
| Required number of approvals | `1` |
| Dismiss stale pull request approvals when new commits are pushed | ✅ enabled |
| Require status checks to pass before merging | ✅ enabled |
| Required status checks | `lint`, `typecheck`, `test`, `e2e` |
| Require branches to be up to date before merging | ✅ enabled |
| Do not allow bypassing the above settings | ✅ enabled |
| Allow force pushes | ❌ disabled |
| Allow deletions | ❌ disabled |

## How `auto-approve` + branch protection work together

The `auto-approve.yml` workflow posts an approving review immediately when a PR targets `main` (satisfying the "1 approving review" requirement). Branch protection then gates merge on **both**:

1. The auto-approval being present
2. All four required checks passing: `lint`, `typecheck`, `test`, `e2e`

A PR with a failing check receives the auto-approval but **cannot be merged** — the branch protection gate holds until all checks are green. This achieves AR2 (branch protection) and AR3 (auto-approve) from the project brief.

## Required check names

The check names (`lint`, `typecheck`, `test`, `e2e`) match the `jobs:` keys in `.github/workflows/ci.yml` exactly. GitHub populates these in the branch protection dropdown after the CI workflow has run at least once on a PR.

## References

- `.github/workflows/auto-approve.yml` — workflow that posts the approving review
- `.github/workflows/ci.yml` — defines the four required job checks
- `docs/planning-artifacts/architecture.md` §4.10 — architecture requirement for branch protection + auto-approve
