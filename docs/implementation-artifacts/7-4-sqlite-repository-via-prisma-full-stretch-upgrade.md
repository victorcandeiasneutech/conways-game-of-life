# Story 7.4: SQLite repository via Prisma (full-stretch upgrade)

Status: ready-for-dev

## Story

As the future maintainer,
I want a Prisma + SQLite-backed `PatternRepository` implementation,
so that saved patterns survive server restarts.

## Acceptance Criteria

1. **Given** `apps/api/prisma/schema.prisma` matches the architecture §5.4 schema,
   **When** `pnpm prisma migrate dev --name init --schema apps/api/prisma/schema.prisma` is run from the workspace root,
   **Then** the migration produces a `patterns.db` file at `apps/api/data/patterns.db`.

2. **Given** `SqlitePatternRepository` implements `PatternRepository`,
   **When** registered to `PatternsModule` in place of `InMemoryPatternRepository`,
   **Then** all controller behavior from story 7.1 is preserved — the same Jest contract scenarios (list/get/create round-trips and 404 on missing id) pass against the Prisma implementation.

3. **Given** Jest specs for `SqlitePatternRepository`,
   **When** `pnpm nx test api` runs,
   **Then** all specs pass without leaving `.db` files in the repo.

4. **Given** `pnpm nx affected -t lint,typecheck,test --base=origin/main` is run,
   **When** all checks complete,
   **Then** green across lint, typecheck, and test.

## Tasks / Subtasks

- [ ] Install Prisma at workspace root: `pnpm add -w @prisma/client` and `pnpm add -Dw prisma` (AC: 1)
- [ ] Create `apps/api/prisma/schema.prisma` with `env("DATABASE_URL")` datasource and `Pattern` model (AC: 1)
- [ ] Create `apps/api/.env` with `DATABASE_URL=file:../data/patterns.db` (gitignored) (AC: 1)
- [ ] Create `apps/api/data/.gitkeep`; add `apps/api/data/*.db` and `apps/api/.env` to root `.gitignore` (AC: 1)
- [ ] Run `pnpm prisma migrate dev --name init --schema apps/api/prisma/schema.prisma` to produce first migration (AC: 1)
- [ ] Create `apps/api/src/patterns/patterns.constants.ts` with `PATTERN_REPOSITORY` injection token (AC: 2)
- [ ] Create `apps/api/src/patterns/prisma.service.ts` — `PrismaService extends PrismaClient implements OnModuleInit` (AC: 2)
- [ ] Create `apps/api/src/patterns/prisma.repository.ts` — `SqlitePatternRepository implements PatternRepository` (AC: 2)
- [ ] Update `apps/api/src/patterns/patterns.service.ts` — inject via `PATTERN_REPOSITORY` token (AC: 2)
- [ ] Update `apps/api/src/patterns/patterns.module.ts` — wire `PrismaService`, `SqlitePatternRepository`, and `PATTERN_REPOSITORY` token (AC: 2)
- [ ] Create `apps/api/src/patterns/prisma.repository.spec.ts` — contract tests against `SqlitePatternRepository` (AC: 3)
- [ ] Verify `patterns.controller.spec.ts` and `in-memory.repository.spec.ts` still pass unmodified (AC: 3)
- [ ] Add `DATABASE_URL` override in jest config or `tsconfig.spec.json` for test isolation (AC: 3)
- [ ] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 4)
- [ ] Update `docs/implementation-artifacts/sprint-status.yaml` — 7-4 → review; 7-3 → done

## Dev Notes

### What exists (story 7.1–7.3 baseline)

- `apps/api/src/patterns/in-memory.repository.ts` — `InMemoryPatternRepository implements PatternRepository` (Map-backed, `crypto.randomUUID()`)
- `apps/api/src/patterns/patterns.service.ts` — currently injects `InMemoryPatternRepository` **by class** (not via interface token) — **must be changed**
- `apps/api/src/patterns/patterns.module.ts` — `providers: [PatternsService, InMemoryPatternRepository]` — **must be changed**
- `apps/api/src/patterns/patterns.controller.spec.ts` — mocks `PatternsService` wholesale; unaffected by DI changes
- `apps/api/src/patterns/in-memory.repository.spec.ts` — tests `InMemoryPatternRepository` directly; unaffected
- `PatternRepository` interface in `libs/types/src/lib/pattern-repository.ts` — already correct; do not touch

### Prisma installation

Prisma is not yet in the workspace. Install at workspace root (all pnpm installs must use `-w`):

```bash
pnpm add -w @prisma/client
pnpm add -Dw prisma
```

### Schema — `apps/api/prisma/schema.prisma`

Use `env("DATABASE_URL")` (not a hardcoded path) so tests can override with in-memory SQLite:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Pattern {
  id        String   @id @default(uuid())
  name      String
  width     Int
  height    Int
  liveCells String   // JSON-encoded [number, number][]
  createdAt DateTime @default(now())
}
```

### Environment files

`apps/api/.env` (gitignored — add to `.gitignore` in root):
```
DATABASE_URL="file:../data/patterns.db"
```

The path `file:../data/patterns.db` is relative to the `prisma/` directory (where schema.prisma lives), placing the database at `apps/api/data/patterns.db`. Create `apps/api/data/.gitkeep` so the directory is tracked.

Root `.gitignore` additions:
```
apps/api/data/*.db
apps/api/.env
```

### Running the migration

From the **workspace root**:
```bash
pnpm prisma migrate dev --name init --schema apps/api/prisma/schema.prisma
```

This both migrates and generates the Prisma client. If you change the schema later, run `migrate dev --name <description>`. Do NOT run `prisma generate` separately — `migrate dev` includes generation.

### Injection token — `apps/api/src/patterns/patterns.constants.ts`

```typescript
export const PATTERN_REPOSITORY = 'PATTERN_REPOSITORY';
```

### `PrismaService` — `apps/api/src/patterns/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### `SqlitePatternRepository` — `apps/api/src/patterns/prisma.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import type { PatternRepository, SavedPattern } from '@conways-game-of-life/types';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class SqlitePatternRepository implements PatternRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SavedPattern[]> {
    const rows = await this.prisma.pattern.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(this.toSavedPattern);
  }

  async get(id: string): Promise<SavedPattern | null> {
    const row = await this.prisma.pattern.findUnique({ where: { id } });
    return row ? this.toSavedPattern(row) : null;
  }

  async create(input: Omit<SavedPattern, 'id' | 'createdAt'>): Promise<SavedPattern> {
    const row = await this.prisma.pattern.create({
      data: {
        name: input.name,
        width: input.width,
        height: input.height,
        liveCells: JSON.stringify(input.liveCells),
      },
    });
    return this.toSavedPattern(row);
  }

  private toSavedPattern(row: { id: string; name: string; width: number; height: number; liveCells: string; createdAt: Date }): SavedPattern {
    return {
      id: row.id,
      name: row.name,
      width: row.width,
      height: row.height,
      liveCells: JSON.parse(row.liveCells) as [number, number][],
      createdAt: row.createdAt.toISOString(),
    };
  }
}
```

**Critical:** `liveCells` is stored as JSON `String` in SQLite. Serialize with `JSON.stringify` on write, `JSON.parse` on read. `createdAt` is a Prisma `DateTime` (JavaScript `Date`); convert to ISO string for `SavedPattern.createdAt`.

**Import style:** Use `.js` extension on local imports (`'./prisma.service.js'`) because `tsconfig.app.json` uses `module: nodenext` + `moduleResolution: nodenext`.

### Update `PatternsService` — inject via interface token

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PatternRepository, SavedPattern } from '@conways-game-of-life/types';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';
import { PATTERN_REPOSITORY } from './patterns.constants.js';

@Injectable()
export class PatternsService {
  constructor(
    @Inject(PATTERN_REPOSITORY) private readonly repo: PatternRepository,
  ) {}

  list(): Promise<SavedPattern[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<SavedPattern> {
    const pattern = await this.repo.get(id);
    if (!pattern) throw new NotFoundException(`Pattern ${id} not found`);
    return pattern;
  }

  create(dto: CreatePatternDto): Promise<SavedPattern> {
    return this.repo.create(dto);
  }
}
```

### Update `PatternsModule` — wire token to `SqlitePatternRepository`

```typescript
import { Module } from '@nestjs/common';
import { PatternsController } from './patterns.controller.js';
import { PatternsService } from './patterns.service.js';
import { PrismaService } from './prisma.service.js';
import { SqlitePatternRepository } from './prisma.repository.js';
import { PATTERN_REPOSITORY } from './patterns.constants.js';

@Module({
  controllers: [PatternsController],
  providers: [
    PrismaService,
    SqlitePatternRepository,
    { provide: PATTERN_REPOSITORY, useExisting: SqlitePatternRepository },
    PatternsService,
  ],
})
export class PatternsModule {}
```

The `{ provide: PATTERN_REPOSITORY, useExisting: SqlitePatternRepository }` pattern avoids creating two instances of the repository — it aliases the same singleton.

### Contract tests — `apps/api/src/patterns/prisma.repository.spec.ts`

Use `DATABASE_URL=file::memory:?cache=shared` (SQLite in-memory) so tests are self-contained and leave no `.db` files. Prisma's in-memory SQLite is available without a migration — use `prisma.$executeRaw` to create the table, or `prisma.$pushSchema()` alternative. The cleanest approach for test isolation is `prisma db push --skip-generate` logic, but in Jest the simplest is:

```typescript
import { PrismaClient } from '@prisma/client';
import { SqlitePatternRepository } from './prisma.repository';
import { PrismaService } from './prisma.service';

// Override DATABASE_URL before importing PrismaClient
process.env['DATABASE_URL'] = 'file::memory:?cache=shared';

describe('SqlitePatternRepository', () => {
  let prisma: PrismaService;
  let repo: SqlitePatternRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    // Push schema to in-memory SQLite without migrations
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Pattern" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "name"      TEXT NOT NULL,
        "width"     INTEGER NOT NULL,
        "height"    INTEGER NOT NULL,
        "liveCells" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    repo = new SqlitePatternRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.pattern.deleteMany();
  });

  it('returns empty list initially', async () => {
    expect(await repo.list()).toEqual([]);
  });

  it('creates and retrieves a pattern', async () => {
    const input = { name: 'blinker', width: 5, height: 5, liveCells: [[1,2],[2,2],[3,2]] as [number,number][] };
    const saved = await repo.create(input);
    expect(saved.id).toBeDefined();
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await repo.get(saved.id)).toEqual(saved);
    expect(saved.liveCells).toEqual([[1,2],[2,2],[3,2]]);
  });

  it('returns null for unknown id', async () => {
    expect(await repo.get('unknown')).toBeNull();
  });

  it('lists all created patterns in insertion order', async () => {
    await repo.create({ name: 'a', width: 5, height: 5, liveCells: [] });
    await repo.create({ name: 'b', width: 5, height: 5, liveCells: [] });
    const list = await repo.list();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('a');
    expect(list[1].name).toBe('b');
  });
});
```

**Alternative approach** if in-memory SQLite DDL is problematic: generate the Prisma client with `prisma generate` first, then use a temp `.db` file and clean it in `afterAll`. But the in-memory approach avoids any filesystem side effects and is preferred.

### `patterns.controller.spec.ts` — no changes needed

The controller spec mocks `PatternsService` entirely (`useValue: mockService`). The DI refactoring in the service does not affect it. **Do not modify this file.**

### `in-memory.repository.spec.ts` — no changes needed

Tests `InMemoryPatternRepository` directly without NestJS DI. **Do not modify this file.** (Keep `InMemoryPatternRepository` in the codebase; it remains a valid implementation of `PatternRepository` even if not wired into the live module.)

### Webpack and Prisma native binaries

Prisma's client uses native binaries (`.node` files) at `node_modules/.prisma/client/`. The NxAppWebpackPlugin may try to bundle these. If `pnpm nx serve api` fails with errors about native modules, add to `webpack.config.js`:

```js
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  externals: { '@prisma/client': 'commonjs @prisma/client' },
  output: { ... },
  plugins: [ new NxAppWebpackPlugin({ ... }) ],
};
```

For local dev with `pnpm nx serve api`, the built output in `apps/api/dist/` resolves `@prisma/client` from `node_modules/` in the workspace root via Node.js module resolution — this typically works without any webpack changes.

### Key architectural pattern

The NestJS module boundary is maintained: `apps/api` (`scope:server`) only depends on `libs/types` (`scope:types`). Prisma is a third-party npm package, not a workspace lib — no boundary violation.

The `PatternsService` now depends on the `PatternRepository` **interface** (from `libs/types`) via injection token, not on a concrete class. This means both `InMemoryPatternRepository` and `SqlitePatternRepository` satisfy the contract with zero service changes.

### References

- [Source: docs/planning-artifacts/architecture.md#5.4] — Prisma schema, repository interface, SQLite design
- [Source: docs/planning-artifacts/architecture.md#5.6] — module boundary tag rules (scope:server → scope:types only)
- [Source: docs/implementation-artifacts/7-1-nestjs-apps-api-with-in-memory-pattern-repository.md] — existing service, module, DI patterns
- [Source: apps/api/src/patterns/in-memory.repository.ts] — reference implementation shape
- [Source: apps/api/tsconfig.app.json] — `module: nodenext` requires `.js` extensions on local imports

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
