import { createGrid } from './grid';
import { step } from './rules/conway';
import { block, blinker, glider, gosperGliderGun, PATTERNS, placePattern } from './patterns';

function liveCells(grid: ReturnType<typeof createGrid>): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y * grid.width + x] === 1) result.push([x, y]);
    }
  }
  return result;
}

function cellKey(cells: Array<[number, number]>): string {
  return cells.map(([x, y]) => `${x},${y}`).sort().join('|');
}

describe('NamedPattern records', () => {
  it('exports block, blinker, glider, gosperGliderGun with required fields', () => {
    for (const p of [block, blinker, glider, gosperGliderGun]) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      expect(Array.isArray(p.liveCells)).toBe(true);
    }
  });

  it('PATTERNS contains all four presets', () => {
    expect(PATTERNS).toHaveLength(4);
    expect(PATTERNS.map(p => p.id)).toEqual(['block', 'blinker', 'glider', 'gosperGliderGun']);
  });

  it('gosperGliderGun has 36 live cells in a 36x9 bounding box', () => {
    expect(gosperGliderGun.width).toBe(36);
    expect(gosperGliderGun.height).toBe(9);
    expect(gosperGliderGun.liveCells).toHaveLength(36);
  });
});

describe('placePattern', () => {
  it('places cells at anchor offset', () => {
    const grid = createGrid(10, 10);
    const g = placePattern(grid, block, 2, 3);
    expect(g.cells[3 * 10 + 2]).toBe(1); // (2,3)
    expect(g.cells[3 * 10 + 3]).toBe(1); // (3,3)
    expect(g.cells[4 * 10 + 2]).toBe(1); // (2,4)
    expect(g.cells[4 * 10 + 3]).toBe(1); // (3,4)
    expect(liveCells(g)).toHaveLength(4);
  });

  it('skips cells that exceed grid bounds', () => {
    const grid = createGrid(5, 5);
    // Glider at (3,3): live cells at (4,3),(5,4)→out,(3,5)→out,(4,5)→out,(5,5)→out
    const g = placePattern(grid, glider, 3, 3);
    expect(g.width).toBe(5);
    expect(g.height).toBe(5);
    expect(liveCells(g)).toHaveLength(1);
    expect(g.cells[3 * 5 + 4]).toBe(1); // only (4,3) fits
  });

  it('returns original grid unchanged (immutable)', () => {
    const grid = createGrid(10, 10);
    placePattern(grid, block, 0, 0);
    expect(liveCells(grid)).toHaveLength(0);
  });
});

describe('canonical glider', () => {
  it('translates by (1,1) after 4 steps', () => {
    const grid = createGrid(20, 20);
    const placed = placePattern(grid, glider, 0, 0);

    let current = placed;
    for (let i = 0; i < 4; i++) current = step(current);

    const expected = glider.liveCells.map(([x, y]) => [x + 1, y + 1] as [number, number]);
    const actual = liveCells(current);

    expect(cellKey(actual)).toBe(cellKey(expected));
  });
});

describe('canonical blinker', () => {
  it('oscillates with period 2', () => {
    const grid = createGrid(10, 10);
    // Place horizontal blinker centered so vertical phase fits
    const placed = placePattern(grid, blinker, 3, 4);

    const afterTwo = step(step(placed));

    expect(Array.from(afterTwo.cells)).toEqual(Array.from(placed.cells));
  });
});
