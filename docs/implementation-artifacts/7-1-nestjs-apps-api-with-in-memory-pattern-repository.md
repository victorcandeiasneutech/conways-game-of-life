# Story 7.1: NestJS `apps/api` with in-memory pattern repository

Status: review

## Story

As Casey,
I want a working NestJS API that holds saved patterns in memory,
so that save/load round-trips work during a single server lifetime without any ops overhead.

## Acceptance Criteria

1. **Given** the NestJS app at `apps/api`,
   **When** started locally with `pnpm nx serve api`,
   **Then** it listens on port 3333 and exposes `GET /patterns`, `GET /patterns/:id`, `POST /patterns`.

2. **Given** `InMemoryPatternRepository` registered to `PatternsModule`,
   **When** a `POST /patterns` is received with a valid body `{name, width, height, liveCells}`,
   **Then** the response is 201 with the saved pattern including a generated UUID `id` and ISO-8601 `createdAt`.

3. **Given** `class-validator` DTO validation,
   **When** a malformed body is posted (missing `name`, `width` outside 5–100, `height` outside 5–100, malformed `liveCells`),
   **Then** the API responds 400 with a structured error (NestJS default `ValidationPipe` format).

4. **Given** a `GET /patterns/:id` with an unknown id,
   **When** requested,
   **Then** the API responds 404.

5. **Given** Jest specs for the repository and controller,
   **When** `pnpm nx test api` runs,
   **Then** specs verify list/get/create round-trips and 404 on missing id, and the suite passes.

6. **Given** the `SavedPattern` and `PatternRepository` types are added to `libs/types`,
   **When** any code imports `@conways-game-of-life/types`,
   **Then** `SavedPattern` and `PatternRepository` are available (matching architecture §5.4 exactly).

## Tasks / Subtasks

- [x] Install `@nx/nest@22.7.1` and NestJS runtime packages (AC: 1)
- [x] Scaffold `apps/api` with `pnpm nx g @nx/nest:app api --tags=scope:server` (AC: 1)
- [x] Enable CORS in `apps/api/src/main.ts` for `http://localhost:3000` (AC: 1)
- [x] Enable `ValidationPipe` globally in `apps/api/src/main.ts` (AC: 3)
- [x] Add `SavedPattern` and `PatternRepository` to `libs/types/src/lib/pattern-repository.ts` (AC: 6)
- [x] Export `pattern-repository.js` from `libs/types/src/index.ts` (AC: 6)
- [x] Create `apps/api/src/patterns/dto/create-pattern.dto.ts` with class-validator decorators (AC: 3)
- [x] Create `apps/api/src/patterns/in-memory.repository.ts` implementing `PatternRepository` (AC: 2)
- [x] Create `apps/api/src/patterns/patterns.service.ts` wrapping the repository (AC: 1, 2, 4)
- [x] Create `apps/api/src/patterns/patterns.controller.ts` with the three REST endpoints (AC: 1, 2, 4)
- [x] Create `apps/api/src/patterns/patterns.module.ts` — register service + repository (AC: 1)
- [x] Update `apps/api/src/app.module.ts` to import `PatternsModule` (AC: 1)
- [x] Write `apps/api/src/patterns/in-memory.repository.spec.ts` — list/get/create/404 round-trip (AC: 5)
- [x] Write `apps/api/src/patterns/patterns.controller.spec.ts` — controller unit tests with mock service (AC: 5)
- [x] Run `pnpm nx affected -t lint,typecheck,test --base=origin/main` — green (AC: 1–6)
- [x] Update `docs/implementation-artifacts/sprint-status.yaml` — 7-1 → review

## Dev Notes

### CRITICAL: `@nx/nest` is NOT installed — install it first

```bash
pnpm add -D @nx/nest@22.7.1
```

Then install NestJS runtime and peer dependencies:

```bash
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs class-validator class-transformer
pnpm add -D @nestjs/testing
```

### Scaffold `apps/api`

After installing `@nx/nest`:

```bash
pnpm nx g @nx/nest:app api --tags=scope:server
```

Verify the generator output. The generator will create:
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/app.controller.ts` (delete or keep as health-check)
- `apps/api/src/app.service.ts` (delete or keep)
- `apps/api/project.json` — **verify `tags: ["scope:server"]` is present**

**Do NOT add `apps/api-e2e`** — that is out of scope for this story. If the generator creates it, delete it or decline it with `--no-e2e`.

Nx 22 flag reference: `--tags` (not `--tag`). If the generator doesn't support `--tags`, add the tag manually to `apps/api/project.json` after scaffolding.

### `main.ts` setup

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(3333);
}
bootstrap();
```

`whitelist: true` strips unknown properties. `forbidNonWhitelisted: true` returns 400 if extra properties are sent — matches AC 3.

### Architecture §5.4 — `SavedPattern` and `PatternRepository` (exact types)

Add to `libs/types/src/lib/pattern-repository.ts`:

```typescript
export interface SavedPattern {
  id: string;
  name: string;
  width: number;
  height: number;
  liveCells: ReadonlyArray<readonly [number, number]>;
  createdAt: string; // ISO 8601
}

export interface PatternRepository {
  list(): Promise<SavedPattern[]>;
  get(id: string): Promise<SavedPattern | null>;
  create(input: Omit<SavedPattern, 'id' | 'createdAt'>): Promise<SavedPattern>;
}
```

Then add to `libs/types/src/index.ts` — **use `.js` extension (moduleResolution: nodenext):**

```typescript
export * from './lib/pattern-repository.js';
```

**Known gotcha:** `libs/types` uses `moduleResolution: nodenext` — the `.js` extension is mandatory in `index.ts` exports even though the source file is `.ts`. Check existing exports in `libs/types/src/index.ts` and follow the same pattern (see `'./lib/grid.js'`, `'./lib/patterns.js'`).

### DTO with class-validator

```typescript
// apps/api/src/patterns/dto/create-pattern.dto.ts
import { IsString, IsInt, IsArray, Min, Max, ArrayNotEmpty } from 'class-validator';

export class CreatePatternDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(5)
  @Max(100)
  width!: number;

  @IsInt()
  @Min(5)
  @Max(100)
  height!: number;

  @IsArray()
  @ArrayNotEmpty()
  liveCells!: [number, number][];
}
```

Width/height bounds (5–100) match the MVP grid bounds from project-context rule 17.

### `InMemoryPatternRepository`

```typescript
// apps/api/src/patterns/in-memory.repository.ts
import { Injectable } from '@nestjs/common';
import type { PatternRepository, SavedPattern } from '@conways-game-of-life/types';

@Injectable()
export class InMemoryPatternRepository implements PatternRepository {
  private readonly store = new Map<string, SavedPattern>();

  async list(): Promise<SavedPattern[]> {
    return [...this.store.values()];
  }

  async get(id: string): Promise<SavedPattern | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: Omit<SavedPattern, 'id' | 'createdAt'>): Promise<SavedPattern> {
    const pattern: SavedPattern = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.store.set(pattern.id, pattern);
    return pattern;
  }
}
```

`crypto.randomUUID()` is available in Node 18+ (no import needed). `new Date().toISOString()` produces ISO 8601.

### `PatternsService`

```typescript
// apps/api/src/patterns/patterns.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryPatternRepository } from './in-memory.repository';
import type { SavedPattern } from '@conways-game-of-life/types';
import type { CreatePatternDto } from './dto/create-pattern.dto';

@Injectable()
export class PatternsService {
  constructor(private readonly repo: InMemoryPatternRepository) {}

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

### `PatternsController`

```typescript
// apps/api/src/patterns/patterns.controller.ts
import { Controller, Get, Post, Param, Body, HttpCode } from '@nestjs/common';
import { PatternsService } from './patterns.service';
import { CreatePatternDto } from './dto/create-pattern.dto';

@Controller('patterns')
export class PatternsController {
  constructor(private readonly service: PatternsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePatternDto) {
    return this.service.create(dto);
  }
}
```

### `PatternsModule`

```typescript
// apps/api/src/patterns/patterns.module.ts
import { Module } from '@nestjs/common';
import { PatternsController } from './patterns.controller';
import { PatternsService } from './patterns.service';
import { InMemoryPatternRepository } from './in-memory.repository';

@Module({
  controllers: [PatternsController],
  providers: [PatternsService, InMemoryPatternRepository],
})
export class PatternsModule {}
```

### `AppModule` update

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { PatternsModule } from './patterns/patterns.module';

@Module({
  imports: [PatternsModule],
})
export class AppModule {}
```

Remove the generated `AppController` and `AppService` imports if present — they are not needed.

### Jest tests

**Repository spec:**

```typescript
// apps/api/src/patterns/in-memory.repository.spec.ts
import { InMemoryPatternRepository } from './in-memory.repository';

describe('InMemoryPatternRepository', () => {
  let repo: InMemoryPatternRepository;

  beforeEach(() => { repo = new InMemoryPatternRepository(); });

  it('returns empty list initially', async () => {
    expect(await repo.list()).toEqual([]);
  });

  it('creates and retrieves a pattern', async () => {
    const input = { name: 'blinker', width: 5, height: 5, liveCells: [[1,2],[2,2],[3,2]] as [number,number][] };
    const saved = await repo.create(input);
    expect(saved.id).toBeDefined();
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await repo.get(saved.id)).toEqual(saved);
  });

  it('returns null for unknown id', async () => {
    expect(await repo.get('unknown')).toBeNull();
  });

  it('lists all created patterns', async () => {
    await repo.create({ name: 'a', width: 5, height: 5, liveCells: [] });
    await repo.create({ name: 'b', width: 5, height: 5, liveCells: [] });
    expect(await repo.list()).toHaveLength(2);
  });
});
```

**Controller spec (NestJS Testing module):**

```typescript
// apps/api/src/patterns/patterns.controller.spec.ts
import { Test } from '@nestjs/testing';
import { PatternsController } from './patterns.controller';
import { PatternsService } from './patterns.service';
import { NotFoundException } from '@nestjs/common';

const mockService = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
};

describe('PatternsController', () => {
  let controller: PatternsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PatternsController],
      providers: [{ provide: PatternsService, useValue: mockService }],
    }).compile();
    controller = module.get(PatternsController);
    jest.clearAllMocks();
  });

  it('list() delegates to service', async () => {
    mockService.list.mockResolvedValue([]);
    expect(await controller.list()).toEqual([]);
  });

  it('get() returns pattern for valid id', async () => {
    const p = { id: '1', name: 'blinker', width: 5, height: 5, liveCells: [], createdAt: '' };
    mockService.get.mockResolvedValue(p);
    expect(await controller.get('1')).toEqual(p);
  });

  it('get() propagates NotFoundException', async () => {
    mockService.get.mockRejectedValue(new NotFoundException());
    await expect(controller.get('missing')).rejects.toThrow(NotFoundException);
  });

  it('create() returns saved pattern', async () => {
    const dto = { name: 'blinker', width: 5, height: 5, liveCells: [[1,2],[2,2],[3,2]] as [number,number][] };
    const saved = { ...dto, id: 'uuid', createdAt: '2026-01-01T00:00:00.000Z' };
    mockService.create.mockResolvedValue(saved);
    expect(await controller.create(dto)).toEqual(saved);
  });
});
```

### Module boundary verification

`apps/api` is tagged `scope:server`. Per `eslint.config.mjs`, `scope:server` may only depend on `scope:sim` and `scope:types`. The `InMemoryPatternRepository` imports `@conways-game-of-life/types` only — ✅. Do NOT import from `@conways-game-of-life/sim` in this story (no simulation logic in the API).

### `reflect-metadata` import

NestJS requires `reflect-metadata` to be imported once at the entry point:

```typescript
// apps/api/src/main.ts — add as first import
import 'reflect-metadata';
```

The `@nx/nest` generator usually adds this. Verify it's present.

### TypeScript config for `apps/api`

The generator creates `apps/api/tsconfig.json` and `apps/api/tsconfig.app.json`. NestJS requires:
- `"experimentalDecorators": true`
- `"emitDecoratorMetadata": true`

The generator adds these automatically. If missing, add to `apps/api/tsconfig.json` `compilerOptions`.

### Running the API locally

```bash
pnpm nx serve api
# → http://localhost:3333/patterns
```

### CI considerations

Story 7.1 introduces a new `apps/api` project. `pnpm nx affected -t lint,typecheck,test --base=origin/main` will pick it up automatically. The existing `web` E2E spec does NOT require the API (it tests sim/canvas only), so the `e2e` CI job is unaffected.

The `apps/api` project should use the Nx-inferred `typecheck` target (not a custom `nx:run-commands` one). Verify after scaffolding. If a custom target is needed, add `"dependsOn": ["^typecheck"]` (learned from Epic 6 story 6.1).

### Project Structure Notes

- New files: `apps/api/src/patterns/` (controller, service, module, repository, dto)
- New types: `libs/types/src/lib/pattern-repository.ts`
- Modified: `libs/types/src/index.ts` (add pattern-repository.js export)
- Modified: `apps/api/src/app.module.ts` (import PatternsModule)
- Modified: `apps/api/src/main.ts` (CORS, ValidationPipe, reflect-metadata)
- `libs/api-client` is NOT touched in this story — that is story 7.2

### References

- [Source: docs/planning-artifacts/architecture.md#5.4] — `PatternRepository` interface and `SavedPattern` type (exact canonical source)
- [Source: docs/planning-artifacts/architecture.md#4.7] — NestJS choice rationale (REST, three endpoints only)
- [Source: docs/planning-artifacts/architecture.md#4.9] — API style, endpoint shapes
- [Source: docs/planning-artifacts/architecture.md#5.6] — `scope:server` tag boundary rules
- [Source: docs/planning-artifacts/epics.md#Story-7.1] — ACs and effort estimate
- [Source: docs/implementation-artifacts/epic-6-retro-2026-05-11.md] — custom Nx typecheck target `dependsOn` pattern
- [Source: docs/implementation-artifacts/epic-5-retro-2026-05-10.md] — `libs/types` `.js` extension pattern in index.ts exports

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `@nx/nest` generator placed the app at root `api/` — moved to `apps/api/` to match workspace convention; updated `tsconfig.json` and `tsconfig.app.json` extends paths from `../tsconfig.base.json` to `../../tsconfig.base.json`.
- `api-e2e` was created by the generator — deleted per story requirement (out of scope).
- `pnpm-workspace.yaml` entries for `api` and `api-e2e` removed; `apps/*` glob covers `apps/api` automatically.
- `apps/api/package.json` build target `cwd` updated from `api` to `apps/api`; dist output paths updated accordingly.
- `tsconfig.app.json` exclude list added for `**/*.spec.ts` and `**/*.test.ts` — prevents jest globals leaking into app typecheck (no jest types in app tsconfig).
- `jest.config.ts` and `tsconfig.spec.json` created manually (generator does not create them for NestJS apps in this Nx setup); spec tsconfig uses `module: commonjs` + `moduleResolution: node` for Jest compatibility.
- NestJS runtime packages installed at workspace root (`-w` flag) since pnpm workspace root requires explicit opt-in.
- `crypto.randomUUID()` available natively in Node 18+ — no import needed.
- Nx inferred `typecheck` target already has `dependsOn: ["^typecheck"]` — no custom target needed (carry-forward from Epic 6 retro action item verified ✅).

### File List

- `apps/api/src/main.ts`
- `apps/api/src/app/app.module.ts`
- `apps/api/src/patterns/dto/create-pattern.dto.ts`
- `apps/api/src/patterns/in-memory.repository.ts`
- `apps/api/src/patterns/in-memory.repository.spec.ts`
- `apps/api/src/patterns/patterns.service.ts`
- `apps/api/src/patterns/patterns.controller.ts`
- `apps/api/src/patterns/patterns.controller.spec.ts`
- `apps/api/src/patterns/patterns.module.ts`
- `apps/api/tsconfig.json`
- `apps/api/tsconfig.app.json`
- `apps/api/tsconfig.spec.json`
- `apps/api/jest.config.ts`
- `apps/api/package.json`
- `apps/api/webpack.config.js`
- `libs/types/src/lib/pattern-repository.ts`
- `libs/types/src/index.ts`
- `docs/implementation-artifacts/7-1-nestjs-apps-api-with-in-memory-pattern-repository.md`
- `docs/implementation-artifacts/sprint-status.yaml`
