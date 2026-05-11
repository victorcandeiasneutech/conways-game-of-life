# Story 7.2: `libs/api-client` typed wrapper

Status: review

## Story

As the web app,
I want a typed `libs/api-client` exporting `listPatterns`, `getPattern`, `savePattern`,
so that the Next.js code never calls `fetch` directly and the boundary is enforceable.

## Acceptance Criteria

1. **Given** `libs/api-client/src/lib/patterns.ts`,
   **When** functions are called from `apps/web`,
   **Then** they hit the NestJS endpoints, parse responses with `zod`, and return typed `SavedPattern` records (or throw on error / return `null` for 404).

2. **Given** the Nx tag rules from story 1.2,
   **When** any code in `apps/web` calls `fetch('/patterns')` directly or imports from `apps/api`,
   **Then** lint fails (boundary enforcement — `scope:app` cannot import `scope:server`).

3. **Given** Jest specs for the three functions,
   **When** `pnpm nx test api-client` runs,
   **Then** specs cover success paths, 404 returns `null`, and non-ok responses throw, and the suite passes.

4. **Given** `libs/api-client/src/index.ts` re-exports all public symbols,
   **When** any code imports `@conways-game-of-life/api-client`,
   **Then** `listPatterns`, `getPattern`, `savePattern` are available.

## Tasks / Subtasks

- [x] Install `zod` at workspace root (AC: 1)
- [x] Create `libs/api-client/src/lib/patterns.ts` — `listPatterns`, `getPattern`, `savePattern` with zod response validation (AC: 1, 4)
- [x] Delete stub `libs/api-client/src/lib/api-client.ts` (AC: 4)
- [x] Update `libs/api-client/src/index.ts` to export from `./lib/patterns.js` (AC: 4)
- [x] Create `libs/api-client/jest.config.ts` and `tsconfig.spec.json` (AC: 3)
- [x] Write `libs/api-client/src/lib/patterns.spec.ts` — fetch-mocked unit tests (AC: 3)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1–4)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 7-2 → review

## Dev Notes

### Install `zod`

```bash
pnpm add -w zod
```

### `patterns.ts` — three typed functions with zod validation

```typescript
// libs/api-client/src/lib/patterns.ts
import { z } from 'zod';
import type { SavedPattern } from '@conways-game-of-life/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

const SavedPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  liveCells: z.array(z.tuple([z.number(), z.number()])),
  createdAt: z.string(),
});

export async function listPatterns(): Promise<SavedPattern[]> {
  const res = await fetch(`${API_BASE}/patterns`);
  if (!res.ok) throw new Error(`listPatterns failed: ${res.status}`);
  return z.array(SavedPatternSchema).parse(await res.json()) as unknown as SavedPattern[];
}

export async function getPattern(id: string): Promise<SavedPattern | null> {
  const res = await fetch(`${API_BASE}/patterns/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getPattern failed: ${res.status}`);
  return SavedPatternSchema.parse(await res.json()) as unknown as SavedPattern;
}

export async function savePattern(
  input: Omit<SavedPattern, 'id' | 'createdAt'>,
): Promise<SavedPattern> {
  const res = await fetch(`${API_BASE}/patterns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`savePattern failed: ${res.status}`);
  return SavedPatternSchema.parse(await res.json()) as unknown as SavedPattern;
}
```

`as unknown as SavedPattern` bridges `z.tuple([z.number(), z.number()])[]` → `readonly [number, number][]` — both are structurally equivalent at runtime; the cast is safe.

### `index.ts` update — `.js` extension required

`libs/api-client` uses `moduleResolution: nodenext`. Export must use `.js` extension:

```typescript
export * from './lib/patterns.js';
```

Delete the old `export * from './lib/api-client.js'` line and the `api-client.ts` source file.

### Jest config and `tsconfig.spec.json`

Follow the `libs/sim` pattern exactly — the Nx `@nx/jest` plugin infers the `test` target automatically when `jest.config.ts` is present.

```typescript
// libs/api-client/jest.config.ts
export default {
  displayName: 'api-client',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/libs/api-client',
};
```

```json
// libs/api-client/tsconfig.spec.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./out-tsc/jest",
    "types": ["jest", "node"]
  },
  "include": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"],
  "references": [{ "path": "./tsconfig.lib.json" }]
}
```

### Jest tests — mock `globalThis.fetch`

`fetch` is a global in Node 18+. Mock it with `jest.spyOn`:

```typescript
// libs/api-client/src/lib/patterns.spec.ts
import { listPatterns, getPattern, savePattern } from './patterns';

const mockPattern = {
  id: 'uuid-1', name: 'blinker', width: 5, height: 5,
  liveCells: [[1, 2], [2, 2], [3, 2]] as [number, number][],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function mockFetch(body: unknown, status = 200) {
  jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('patterns api-client', () => {
  afterEach(() => jest.restoreAllMocks());
  ...
});
```

### Module boundary — AC 2 is already satisfied by existing config

`scope:app` cannot import `scope:server` per `eslint.config.mjs`. This is enforced since story 1.2 — no code change needed. Just verify the ESLint boundary rule is still in place (it is — unchanged from story 1.2).

### `libs/api-client` uses `moduleResolution: nodenext` for the lib

The `tsconfig.lib.json` has `module: nodenext`. The `zod` package has a proper `exports` field — it resolves correctly under `nodenext`. No workaround needed.

**Known gotcha:** The spec tsconfig should extend `../../tsconfig.base.json` (which has `moduleResolution: bundler`), NOT `tsconfig.lib.json`. This is the same pattern as `libs/sim` — the Nx-inferred test runner sets `TS_NODE_COMPILER_OPTIONS` to override to CommonJS anyway.

### References

- [Source: docs/planning-artifacts/architecture.md#5.5] — `libs/api-client` typed wrapper design
- [Source: docs/planning-artifacts/architecture.md#5.6] — scope boundary rules
- [Source: docs/planning-artifacts/epics.md#Story-7.2] — ACs and effort estimate
- [Source: docs/implementation-artifacts/7-1-nestjs-apps-api-with-in-memory-pattern-repository.md] — Jest config pattern for Nx projects in this workspace

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed `zod` v4 at workspace root (`-w` flag); v4 API is identical to v3 for the functions used here (`z.object`, `z.string`, `z.number`, `z.array`, `z.tuple`).
- Deleted stub `libs/api-client/src/lib/api-client.ts`; replaced with `patterns.ts` implementing the three typed functions.
- `as unknown as SavedPattern` cast in each return bridges the zod output type (`[number, number][]`) to the `ReadonlyArray<readonly [number, number]>` in `SavedPattern` — structurally equivalent at runtime.
- `tsconfig.lib.json` exclude list added for `**/*.spec.ts` — same fix as story 7.1 `apps/api` to prevent jest globals leaking into lib typecheck.
- `jest.config.ts` and `tsconfig.spec.json` created manually (Nx does not auto-generate them); pattern matches `libs/sim` exactly.
- `process.env['NEXT_PUBLIC_API_BASE_URL']` bracket notation avoids ESLint `@typescript-eslint/dot-notation` warnings on the env var; Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time regardless of notation.
- Nx sync added `../types/tsconfig.lib.json` reference to `tsconfig.lib.json` automatically — carry-forward from Epic 6 pattern verified ✅.

### File List

- `libs/api-client/src/lib/patterns.ts`
- `libs/api-client/src/lib/patterns.spec.ts`
- `libs/api-client/src/index.ts`
- `libs/api-client/jest.config.ts`
- `libs/api-client/tsconfig.lib.json`
- `libs/api-client/tsconfig.spec.json`
- `docs/implementation-artifacts/7-2-libs-api-client-typed-wrapper.md`
- `docs/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `pnpm-lock.yaml`
