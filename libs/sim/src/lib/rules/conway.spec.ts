import { step, conwayRules } from './conway';
import { createGrid, setCell, getCell, cloneGrid } from '../grid';
import type { Grid } from '@conways-game-of-life/types';

function getLiveCells(grid: Grid): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (getCell(grid, x, y) === 1) result.push([x, y]);
    }
  }
  return result.sort(([ax, ay], [bx, by]) => (ay !== by ? ay - by : ax - bx));
}

describe('step — Rule 1: underpopulation (< 2 live neighbors)', () => {
  it('kills a live cell with no neighbors', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    expect(Array.from(step(g).cells)).toEqual(Array(9).fill(0));
  });

  it('kills a live cell with exactly 1 live neighbor', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 1, 1);
    g = setCell(g, 1, 2, 1);
    expect(getCell(step(g), 1, 1)).toBe(0);
    expect(getCell(step(g), 1, 2)).toBe(0);
  });
});

describe('step — Rule 2: survival (2–3 live neighbors)', () => {
  it('leaves a 2×2 block unchanged for 5 generations (canonical still life)', () => {
    let g = createGrid(4, 4);
    g = setCell(g, 1, 1, 1);
    g = setCell(g, 2, 1, 1);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    const initial = Array.from(g.cells);
    for (let i = 0; i < 5; i++) {
      g = step(g);
      expect(Array.from(g.cells)).toEqual(initial);
    }
  });

  it('keeps a live cell with exactly 2 live neighbors alive', () => {
    // Horizontal blinker center cell has 2 neighbors after step → survives
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    expect(getCell(step(g), 2, 2)).toBe(1); // center survives (2 neighbors)
  });
});

describe('step — Rule 3: overpopulation (> 3 live neighbors)', () => {
  it('kills a live cell with exactly 4 live neighbors', () => {
    let g = createGrid(3, 3);
    g = setCell(g, 1, 1, 1); // center — under test
    g = setCell(g, 0, 0, 1);
    g = setCell(g, 2, 0, 1);
    g = setCell(g, 0, 2, 1);
    g = setCell(g, 2, 2, 1);
    // center (1,1) has exactly 4 live diagonal neighbors → overpopulation
    expect(getCell(step(g), 1, 1)).toBe(0);
  });

  it('kills a live cell with more than 4 live neighbors', () => {
    // All-alive 3×3: center has 8 live neighbors
    let g = createGrid(3, 3);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++)
        g = setCell(g, x, y, 1);
    expect(getCell(step(g), 1, 1)).toBe(0);
  });
});

describe('step — Rule 4: reproduction (exactly 3 live neighbors)', () => {
  it('births a dead cell with exactly 3 live neighbors', () => {
    // The blinker's (2,1) cell: dead, but has exactly 3 live neighbors from horizontal blinker
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    expect(getCell(step(g), 2, 1)).toBe(1); // born from reproduction
    expect(getCell(step(g), 2, 3)).toBe(1); // born from reproduction (symmetry)
  });
});

describe('step — blinker (period-2 oscillator, rules 1+4 together)', () => {
  it('oscillates horizontal blinker to vertical and back', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    const initialCells = Array.from(g.cells);

    const gen1 = step(g);
    // Vertical blinker
    expect(getCell(gen1, 2, 1)).toBe(1);
    expect(getCell(gen1, 2, 2)).toBe(1);
    expect(getCell(gen1, 2, 3)).toBe(1);
    // Original horizontal cells are dead
    expect(getCell(gen1, 1, 2)).toBe(0);
    expect(getCell(gen1, 3, 2)).toBe(0);
    // No extra cells
    expect(getLiveCells(gen1)).toEqual([[2, 1], [2, 2], [2, 3]]);

    const gen2 = step(gen1);
    // Restored to original
    expect(Array.from(gen2.cells)).toEqual(initialCells);
  });
});

describe('step — glider (canonical spaceship)', () => {
  it('translates the glider by (+1,+1) every 4 generations', () => {
    let g = createGrid(10, 10);
    const initial: Array<[number, number]> = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
    for (const [x, y] of initial) g = setCell(g, x, y, 1);

    for (let i = 0; i < 4; i++) g = step(g);

    const expected = initial
      .map(([x, y]) => [x + 1, y + 1] as [number, number])
      .sort(([ax, ay], [bx, by]) => (ay !== by ? ay - by : ax - bx));

    expect(getLiveCells(g)).toEqual(expected);
  });
});

describe('step — determinism', () => {
  it('produces byte-identical output across 100 identical runs', () => {
    let seed = createGrid(5, 5);
    seed = setCell(seed, 1, 2, 1);
    seed = setCell(seed, 2, 2, 1);
    seed = setCell(seed, 3, 2, 1);

    const reference = Array.from(step(cloneGrid(seed)).cells);
    for (let i = 0; i < 99; i++) {
      expect(Array.from(step(cloneGrid(seed)).cells)).toEqual(reference);
    }
  });
});

describe('step — immutability', () => {
  it('never mutates the input grid', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    const snapshot = Array.from(g.cells);
    step(g);
    expect(Array.from(g.cells)).toEqual(snapshot);
  });
});

describe('step — edge cases', () => {
  it('empty grid stays empty', () => {
    const g = createGrid(5, 5);
    expect(Array.from(step(g).cells)).toEqual(Array(25).fill(0));
  });

  it('all-alive 3×3: only the four corners survive', () => {
    let g = createGrid(3, 3);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++)
        g = setCell(g, x, y, 1);
    const result = step(g);
    // corners have 3 live neighbors → survive; edges have 5, center has 8 → all die
    expect(getLiveCells(result)).toEqual([[0, 0], [2, 0], [0, 2], [2, 2]]);
  });

  it('corner cell (0,0) with no other live cells dies', () => {
    const g = setCell(createGrid(5, 5), 0, 0, 1);
    expect(getCell(step(g), 0, 0)).toBe(0);
  });

  it('1×1 live cell dies (no neighbors possible)', () => {
    let g = createGrid(1, 1);
    g = setCell(g, 0, 0, 1);
    expect(getCell(step(g), 0, 0)).toBe(0);
  });
});

describe('conwayRules', () => {
  it('exposes the correct id and name', () => {
    expect(conwayRules.id).toBe('conway');
    expect(conwayRules.name).toBe("Conway's Game of Life");
  });

  it('conwayRules.step produces the same result as step()', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    expect(Array.from(conwayRules.step(g).cells)).toEqual(Array.from(step(g).cells));
  });
});
