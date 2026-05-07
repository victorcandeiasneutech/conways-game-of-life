# Story 1.2: Configure Nx Tags and Prove Module Boundaries Fire

Status: ready-for-dev

## Story

As the candidate,
I want the Nx tag taxonomy plus `@nx/enforce-module-boundaries` configured and demonstrably failing on a deliberate violation,
so that NFR8 is a real, evaluated deliverable rather than a hand-wave.

## Acceptance Criteria

1. **Given** the Nx workspace exists with `apps/web`, `apps/web-e2e`, `libs/sim`, `libs/types`, `libs/ui`, `libs/api-client` (and stretch `apps/api`),
   **When** each project's `tags` are configured in `project.json` per architecture §5.6 taxonomy (`scope:app`, `scope:e2e`, `scope:sim`, `scope:ui`, `scope:api-client`, `scope:types`),
   **Then** the root ESLint config has `@nx/enforce-module-boundaries` with the `depConstraints` from architecture §5.6 and `pnpm nx lint` passes on the empty workspace.

2. **Given** the boundary rules are configured,
   **When** a deliberately violating import is added — `import * as React from 'react'` in `libs/sim/src/index.ts` — on a throwaway branch,
   **Then** `pnpm nx lint sim` fails with an `@nx/enforce-module-boundaries` error.
   **And** the failure output is captured and committed under `docs/implementation-artifacts/` and referenced from the README per NFR8.

3. **Given** the demonstration is captured,
   **When** the violation is reverted,
   **Then** `pnpm nx lint sim` passes again and the violating import is NOT present in any merged commit.

## Tasks / Subtasks

- [ ] Generate the four shared libs as raw generator output (AC: #1)
  - [ ] `pnpm nx g @nx/js:lib sim --directory=libs/sim --bundler=tsc --tags=scope:sim`
  - [ ] `pnpm nx g @nx/react:lib ui --directory=libs/ui --bundler=none --tags=scope:ui`
  - [ ] `pnpm nx g @nx/js:lib api-client --directory=libs/api-client --bundler=tsc --tags=scope:api-client`
  - [ ] `pnpm nx g @nx/js:lib types --directory=libs/types --bundler=tsc --tags=scope:types`
  - [ ] Commit lib generator output as its own focused commit (raw output, no edits): `chore: generate libs sim, ui, api-client, types (raw generator output)`
- [ ] Configure tags on `apps/web` and `apps/web-e2e` via `project.json` (AC: #1)
  - [ ] Create `apps/web/project.json` with `"tags": ["scope:app"]` (see Dev Notes for full file)
  - [ ] Create `apps/web-e2e/project.json` with `"tags": ["scope:e2e"]`
- [ ] Verify `tsconfig.base.json` has `@conways-game-of-life/*` path aliases for all four libs (AC: #1)
  - [ ] Confirm or manually add aliases per architecture §6 (see Dev Notes)
- [ ] Replace wildcard `depConstraints` in `eslint.config.mjs` with the locked taxonomy from architecture §5.6 (AC: #1)
  - [ ] Edit the `@nx/enforce-module-boundaries` rule block (see Dev Notes for exact snippet)
  - [ ] Run `pnpm nx lint` — must pass with zero errors
- [ ] Add `no-restricted-imports` scoped to `libs/sim` (architecture §5.1 + R2) (AC: #1)
  - [ ] Create `libs/sim/eslint.config.mjs` banning `react`, `next/*`, `@nestjs/*` (see Dev Notes)
  - [ ] Run `pnpm nx lint sim` — must still pass
- [ ] Demonstrate deliberate violation on a throwaway branch (AC: #2)
  - [ ] `git checkout -b demo/boundary-violation`
  - [ ] Add `import * as React from 'react'` to top of `libs/sim/src/index.ts`
  - [ ] Run `pnpm nx lint sim 2>&1 | tee /tmp/violation.txt` and capture output
  - [ ] Write captured output into `docs/implementation-artifacts/module-boundary-violation-demo.md`
  - [ ] Return to feature branch: `git checkout -` then `git branch -D demo/boundary-violation`
  - [ ] Confirm violating import is NOT on the feature branch
- [ ] Reference demo in README (AC: #2)
  - [ ] Add "Module boundaries" section to `README.md` linking to `docs/implementation-artifacts/module-boundary-violation-demo.md`
- [ ] Open PR — all tasks above in one PR (AC: #1, #2, #3)

## Dev Notes

### Generator commands (architecture §3)

Run each from the workspace root. Generator names and exact flags reflect Nx conventions — if a flag is not recognized, run `pnpm nx g <generator> --help` and adjust the equivalent, then document the change in the PR description.

```bash
pnpm nx g @nx/js:lib sim --directory=libs/sim --bundler=tsc --tags=scope:sim
pnpm nx g @nx/react:lib ui --directory=libs/ui --bundler=none --tags=scope:ui
pnpm nx g @nx/js:lib api-client --directory=libs/api-client --bundler=tsc --tags=scope:api-client
pnpm nx g @nx/js:lib types --directory=libs/types --bundler=tsc --tags=scope:types
```

The lib generator commits MUST be separate from the tag/ESLint config commits. One sentence per commit message.

### `project.json` for `apps/web` and `apps/web-e2e` (architecture §5.6)

The scaffold did not generate `project.json` for apps. Create them manually:

```json
// apps/web/project.json
{
  "name": "web",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "tags": ["scope:app"]
}
```

```json
// apps/web-e2e/project.json
{
  "name": "web-e2e",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "tags": ["scope:e2e"]
}
```

### `tsconfig.base.json` path aliases (architecture §6)

After lib generation, verify `tsconfig.base.json` contains these paths. Add manually if not auto-generated:

```json
{
  "compilerOptions": {
    "paths": {
      "@conways-game-of-life/sim":        ["libs/sim/src/index.ts"],
      "@conways-game-of-life/ui":         ["libs/ui/src/index.ts"],
      "@conways-game-of-life/api-client": ["libs/api-client/src/index.ts"],
      "@conways-game-of-life/types":      ["libs/types/src/index.ts"]
    }
  }
}
```

### `eslint.config.mjs` — exact `depConstraints` (architecture §5.6)

The scaffold generated `eslint.config.mjs` (flat config) with a permissive wildcard in `depConstraints`. Replace that block with the locked taxonomy. The rule is already present — only the `depConstraints` array changes:

```js
// eslint.config.mjs — replace the depConstraints array inside @nx/enforce-module-boundaries
depConstraints: [
  {
    sourceTag: 'scope:app',
    onlyDependOnLibsWithTags: ['scope:sim', 'scope:ui', 'scope:api-client', 'scope:types'],
  },
  {
    sourceTag: 'scope:server',
    onlyDependOnLibsWithTags: ['scope:sim', 'scope:types'],
  },
  {
    sourceTag: 'scope:api-client',
    onlyDependOnLibsWithTags: ['scope:types'],
  },
  {
    sourceTag: 'scope:ui',
    onlyDependOnLibsWithTags: ['scope:types'],
  },
  {
    sourceTag: 'scope:sim',
    onlyDependOnLibsWithTags: ['scope:types'],
  },
  {
    sourceTag: 'scope:types',
    onlyDependOnLibsWithTags: [],
  },
  {
    sourceTag: 'scope:e2e',
    onlyDependOnLibsWithTags: ['scope:app', 'scope:types'],
  },
],
```

Also set `allow: []` to match architecture §5.6 exactly (the generated file has a regex allow entry — remove it or keep it; removing is cleaner).

### `libs/sim` scoped ESLint rule (architecture §5.1 + R2)

The tag rule does NOT catch imports of npm packages like `react` (not an Nx lib). Add a `no-restricted-imports` rule scoped to `libs/sim`:

```js
// libs/sim/eslint.config.mjs
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'next', 'next/*', '@nestjs/*'] },
      ],
    },
  },
];
```

### Deliberate violation demonstration (architecture §5.6 + NFR8)

```bash
git checkout -b demo/boundary-violation
# Add to top of libs/sim/src/index.ts:
echo "import * as React from 'react';" >> libs/sim/src/index.ts
pnpm nx lint sim 2>&1 | tee /tmp/violation.txt
# Copy output to docs/implementation-artifacts/module-boundary-violation-demo.md
git checkout -
git branch -D demo/boundary-violation
```

Expected failure output:
```
A project tagged with "scope:sim" can only depend on libs tagged with "scope:types".
```

The `module-boundary-violation-demo.md` file must be committed on the feature branch and referenced in `README.md` per NFR8. The violating import must NOT appear in any commit that merges to `main`.

### Tag taxonomy reference (architecture §5.6)

| Project | Tags |
|---|---|
| `apps/web` | `scope:app` |
| `apps/web-e2e` | `scope:e2e` |
| `apps/api` (stretch) | `scope:server` |
| `libs/sim` | `scope:sim` |
| `libs/ui` | `scope:ui` |
| `libs/api-client` | `scope:api-client` |
| `libs/types` | `scope:types` |

### References

- [Source: docs/planning-artifacts/architecture.md#5.6] — Tag taxonomy, depConstraints, allowed dependency matrix, ESLint snippet
- [Source: docs/planning-artifacts/architecture.md#3] — Generator commands
- [Source: docs/planning-artifacts/architecture.md#6] — Path aliases in tsconfig.base.json
- [Source: docs/planning-artifacts/architecture.md#R2] — sim purity drift — no-restricted-imports as second protection layer
- [Source: docs/planning-artifacts/architecture.md#R3] — Module boundary configured but never fires — demo commit is the mitigation
- [Source: docs/planning-artifacts/epics.md#Story-1.2] — Full ACs, FR/NFR coverage (NFR8)
- [Source: docs/project-context.md#3-rule-5] — "Module boundaries must actually fire in CI, not be aspirational"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
