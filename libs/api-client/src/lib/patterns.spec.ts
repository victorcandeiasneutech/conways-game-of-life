import { listPatterns, getPattern, savePattern } from './patterns';

const mockPattern = {
  id: 'uuid-1',
  name: 'blinker',
  width: 5,
  height: 5,
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

describe('listPatterns', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns parsed patterns on success', async () => {
    mockFetch([mockPattern]);
    expect(await listPatterns()).toEqual([mockPattern]);
  });

  it('throws on non-ok response', async () => {
    mockFetch(null, 500);
    await expect(listPatterns()).rejects.toThrow('listPatterns failed: 500');
  });
});

describe('getPattern', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns pattern for known id', async () => {
    mockFetch(mockPattern);
    expect(await getPattern('uuid-1')).toEqual(mockPattern);
  });

  it('returns null for 404', async () => {
    mockFetch(null, 404);
    expect(await getPattern('unknown')).toBeNull();
  });

  it('throws on server error', async () => {
    mockFetch(null, 500);
    await expect(getPattern('id')).rejects.toThrow('getPattern failed: 500');
  });
});

describe('savePattern', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns created pattern on success', async () => {
    mockFetch(mockPattern, 201);
    const input = { name: 'blinker', width: 5, height: 5, liveCells: [[1, 2]] as [number, number][] };
    expect(await savePattern(input)).toEqual(mockPattern);
  });

  it('throws on non-ok response', async () => {
    mockFetch({ message: 'Bad Request' }, 400);
    const input = { name: 'x', width: 5, height: 5, liveCells: [] as [number, number][] };
    await expect(savePattern(input)).rejects.toThrow('savePattern failed: 400');
  });
});
