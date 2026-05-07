# Module Boundary Violation Demonstration (NFR8)

This document captures the proof that `@nx/enforce-module-boundaries` and `no-restricted-imports`
actually fire in CI — satisfying NFR8: "Module boundaries actually enforced; deliberate violation
must fail CI; demonstration in README."

## Setup

Violation added to `libs/sim/src/index.ts` on a throwaway branch (`demo/boundary-violation`):

```ts
import * as React from 'react';
```

`libs/sim` is tagged `scope:sim`, which is only allowed to depend on `scope:types`. React is an
external npm package, not an Nx lib — it is caught by the `no-restricted-imports` rule in
`libs/sim/eslint.config.mjs` (the second protection layer per architecture R2).

## Command

```bash
pnpm nx lint sim
```

## Failure Output

```
/Users/victor/Desktop/conways-game-of-life/libs/sim/src/index.ts
  2:1   error    'react' import is restricted from being used by a pattern  no-restricted-imports
  2:13  warning  'React' is defined but never used                          @typescript-eslint/no-unused-vars

✖ 2 problems (1 error, 1 warning)

NX   Running target lint for project @conways-game-of-life/sim failed

Failed tasks:
- @conways-game-of-life/sim:lint
```

## Outcome

- The `no-restricted-imports` rule (scoped to `libs/sim`) blocked `react` immediately.
- The `@nx/enforce-module-boundaries` rule would additionally block any attempt to import
  another Nx lib outside the allowed `scope:types` dependency.
- The violation commit was **never merged** — only existed on the throwaway branch.
- The throwaway branch was deleted after capturing this output.

## Files enforcing the boundary

| File | Rule | What it blocks |
|---|---|---|
| `eslint.config.mjs` | `@nx/enforce-module-boundaries` | Cross-tag Nx lib imports |
| `libs/sim/eslint.config.mjs` | `no-restricted-imports` | External packages: react, next, @nestjs/* |
