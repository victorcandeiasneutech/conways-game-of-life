import { highLifeRules } from './highlife';
import { conwayRules } from './conway';
import { createGrid, setCell, getCell, cloneGrid } from '../grid';

describe('highLifeRules — identity', () => {
  it('exposes id "highlife" and name "HighLife"', () => {
    expect(highLifeRules.id).toBe('highlife');
    expect(highLifeRules.name).toBe('HighLife');
  });
});

describe('highLifeRules — B3 birth (shared with Conway)', () => {
  it('births a dead cell with exactly 3 live neighbors', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    // cell (2,1) has exactly 3 neighbors → born
    expect(getCell(highLifeRules.step(g), 2, 1)).toBe(1);
  });
});

describe('highLifeRules — B6 birth (HighLife-only)', () => {
  it('births a dead cell with exactly 6 live neighbors', () => {
    // center (2,2) is dead; 6 of its 8 neighbors are alive
    let g = createGrid(5, 5);
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3]] as [number, number][]) {
      g = setCell(g, x, y, 1);
    }
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(1);
  });

  it('does NOT birth with exactly 4 live neighbors (not in B36)', () => {
    let g = createGrid(5, 5);
    // place 4 neighbors around dead (2,2)
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2]] as [number, number][]) {
      g = setCell(g, x, y, 1);
    }
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(0);
  });

  it('does NOT birth with exactly 5 live neighbors (not in B36)', () => {
    let g = createGrid(5, 5);
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2]] as [number, number][]) {
      g = setCell(g, x, y, 1);
    }
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(0);
  });
});

describe('highLifeRules — S23 survival (same as Conway)', () => {
  it('keeps a live cell with 2 live neighbors alive', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    // center (2,2) has 2 horizontal neighbors → survives
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(1);
  });

  it('keeps a live cell with 3 live neighbors alive', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 1, 1, 1);
    g = setCell(g, 2, 1, 1);
    g = setCell(g, 3, 1, 1);
    // (2,2) has 3 neighbors → survives
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(1);
  });

  it('kills a live cell with 1 neighbor (underpopulation)', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 2, 1, 1);
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(0);
  });

  it('kills a live cell with 4 neighbors (overpopulation)', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 2, 2, 1);
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2]] as [number, number][]) {
      g = setCell(g, x, y, 1);
    }
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(0);
  });
});

describe('highLifeRules vs conwayRules — divergence on 6-neighbor case', () => {
  it('HighLife births a dead cell with 6 live neighbors; Conway does not', () => {
    let g = createGrid(5, 5);
    // dead center (2,2) surrounded by 6 live cells
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3]] as [number, number][]) {
      g = setCell(g, x, y, 1);
    }
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(1); // HighLife: B6 fires
    expect(getCell(conwayRules.step(g), 2, 2)).toBe(0);   // Conway: B3 only
  });
});

describe('highLifeRules — S23 does NOT include 6 (live cell with 6 neighbors dies)', () => {
  it('kills a live cell with exactly 6 live neighbors', () => {
    // center (2,2) is ALIVE; same 6-neighbor setup as the B6 birth test
    let g = createGrid(5, 5);
    g = setCell(g, 2, 2, 1); // alive center
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3]] as [number, number][]) {
      g = setCell(g, x, y, 1);
    }
    // alive (2,2) has 6 neighbors → not in S23 → must die
    expect(getCell(highLifeRules.step(g), 2, 2)).toBe(0);
  });
});

describe('highLifeRules — immutability', () => {
  it('never mutates the input grid', () => {
    let g = createGrid(5, 5);
    g = setCell(g, 1, 2, 1);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    const snapshot = Array.from(g.cells);
    highLifeRules.step(g);
    expect(Array.from(g.cells)).toEqual(snapshot);
  });
});

describe('highLifeRules — determinism', () => {
  it('produces byte-identical output across 100 identical runs', () => {
    let seed = createGrid(5, 5);
    seed = setCell(seed, 1, 2, 1);
    seed = setCell(seed, 2, 2, 1);
    seed = setCell(seed, 3, 2, 1);
    const reference = Array.from(highLifeRules.step(cloneGrid(seed)).cells);
    for (let i = 0; i < 99; i++) {
      expect(Array.from(highLifeRules.step(cloneGrid(seed)).cells)).toEqual(reference);
    }
  });
});

describe('highLifeRules — 2×2 block (still life under S23)', () => {
  it('leaves a 2×2 block unchanged for 5 generations', () => {
    let g = createGrid(6, 6);
    g = setCell(g, 2, 2, 1);
    g = setCell(g, 3, 2, 1);
    g = setCell(g, 2, 3, 1);
    g = setCell(g, 3, 3, 1);
    const initial = Array.from(g.cells);
    for (let i = 0; i < 5; i++) {
      g = highLifeRules.step(g);
      expect(Array.from(g.cells)).toEqual(initial);
    }
  });
});
