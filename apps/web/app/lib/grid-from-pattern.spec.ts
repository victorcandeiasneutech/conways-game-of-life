import { extractLiveCells, gridFromSavedPattern } from './grid-from-pattern';
import type { Grid, SavedPattern } from '@conways-game-of-life/types';

function makeGrid(width: number, height: number, live: [number, number][]): Grid {
  const cells = new Uint8Array(width * height);
  for (const [x, y] of live) cells[y * width + x] = 1;
  return { width, height, cells };
}

describe('extractLiveCells', () => {
  it('returns empty array for dead grid', () => {
    expect(extractLiveCells(makeGrid(5, 5, []))).toEqual([]);
  });

  it('returns correct cells for blinker', () => {
    const grid = makeGrid(5, 5, [[1, 2], [2, 2], [3, 2]]);
    expect(extractLiveCells(grid)).toEqual([[1, 2], [2, 2], [3, 2]]);
  });

  it('reads cells in row-major order', () => {
    const grid = makeGrid(3, 3, [[0, 0], [2, 2]]);
    expect(extractLiveCells(grid)).toEqual([[0, 0], [2, 2]]);
  });
});

describe('gridFromSavedPattern', () => {
  const base: SavedPattern = {
    id: 'id', name: 'test', width: 5, height: 5,
    liveCells: [[1, 2], [2, 2], [3, 2]],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('produces grid with correct dimensions', () => {
    const grid = gridFromSavedPattern(base);
    expect(grid.width).toBe(5);
    expect(grid.height).toBe(5);
  });

  it('places live cells correctly', () => {
    const grid = gridFromSavedPattern(base);
    expect(grid.cells[2 * 5 + 1]).toBe(1); // [1,2]
    expect(grid.cells[2 * 5 + 2]).toBe(1); // [2,2]
    expect(grid.cells[2 * 5 + 3]).toBe(1); // [3,2]
    expect(grid.cells[0]).toBe(0);          // dead
  });

  it('ignores out-of-bounds cells', () => {
    const pattern: SavedPattern = { ...base, liveCells: [[99, 99], [1, 1]] };
    const grid = gridFromSavedPattern(pattern);
    expect(grid.cells[1 * 5 + 1]).toBe(1);
    expect(grid.cells.every((v, i) => i === 1 * 5 + 1 ? v === 1 : v === 0)).toBe(true);
  });

  it('round-trips with extractLiveCells', () => {
    const grid = gridFromSavedPattern(base);
    expect(extractLiveCells(grid)).toEqual([[1, 2], [2, 2], [3, 2]]);
  });
});
