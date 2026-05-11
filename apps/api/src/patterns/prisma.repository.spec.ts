import { PrismaService } from './prisma.service';
import { SqlitePatternRepository } from './prisma.repository';

// Use in-memory SQLite for tests — no file system side effects
process.env['DATABASE_URL'] = 'file::memory:?cache=shared';

describe('SqlitePatternRepository', () => {
  let prisma: PrismaService;
  let repo: SqlitePatternRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
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

  it('creates and retrieves a pattern by id', async () => {
    const input = {
      name: 'blinker',
      width: 5,
      height: 5,
      liveCells: [[1, 2], [2, 2], [3, 2]] as [number, number][],
    };
    const saved = await repo.create(input);

    expect(saved.id).toBeDefined();
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saved.name).toBe('blinker');
    expect(saved.liveCells).toEqual([[1, 2], [2, 2], [3, 2]]);

    const retrieved = await repo.get(saved.id);
    expect(retrieved).toEqual(saved);
  });

  it('returns null for unknown id', async () => {
    expect(await repo.get('unknown-id')).toBeNull();
  });

  it('lists all created patterns in insertion order', async () => {
    await repo.create({ name: 'alpha', width: 5, height: 5, liveCells: [] });
    await repo.create({ name: 'beta', width: 5, height: 5, liveCells: [] });

    const list = await repo.list();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('alpha');
    expect(list[1].name).toBe('beta');
  });

  it('round-trips liveCells correctly (empty, single, multiple)', async () => {
    const empty = await repo.create({ name: 'empty', width: 5, height: 5, liveCells: [] });
    expect(empty.liveCells).toEqual([]);

    const single = await repo.create({ name: 'single', width: 5, height: 5, liveCells: [[0, 0]] });
    expect(single.liveCells).toEqual([[0, 0]]);

    const multi = await repo.create({ name: 'multi', width: 10, height: 10, liveCells: [[0, 0], [9, 9], [5, 5]] });
    expect(multi.liveCells).toEqual([[0, 0], [9, 9], [5, 5]]);
  });
});
