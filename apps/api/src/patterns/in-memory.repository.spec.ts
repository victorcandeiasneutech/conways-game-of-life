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
