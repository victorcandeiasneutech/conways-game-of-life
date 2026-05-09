import {
  createGrid,
  cloneGrid,
  getCell,
  setCell,
  toggleCell,
  clearGrid,
} from './grid';

describe('createGrid', () => {
  it('creates a grid with correct dimensions and all-zero cells', () => {
    const g = createGrid(5, 3);
    expect(g.width).toBe(5);
    expect(g.height).toBe(3);
    expect(g.cells.length).toBe(15);
    expect(Array.from(g.cells)).toEqual(Array(15).fill(0));
  });

  it('throws RangeError for zero width', () => {
    expect(() => createGrid(0, 5)).toThrow(RangeError);
  });

  it('throws RangeError for zero height', () => {
    expect(() => createGrid(5, 0)).toThrow(RangeError);
  });

  it('throws RangeError for negative dimensions', () => {
    expect(() => createGrid(-1, 5)).toThrow(RangeError);
    expect(() => createGrid(5, -1)).toThrow(RangeError);
  });
});

describe('cloneGrid', () => {
  it('returns a reference-distinct grid with identical content', () => {
    const a = createGrid(3, 3);
    const b = cloneGrid(a);
    expect(b).not.toBe(a);
    expect(b.cells).not.toBe(a.cells);
    expect(Array.from(b.cells)).toEqual(Array.from(a.cells));
    expect(b.width).toBe(a.width);
    expect(b.height).toBe(a.height);
  });

  it('deep-copies cells so mutations to clone do not affect original', () => {
    const a = setCell(createGrid(3, 3), 1, 1, 1);
    const b = cloneGrid(a);
    expect(getCell(b, 1, 1)).toBe(1);
  });
});

describe('getCell', () => {
  it('returns 1 for a live cell at the correct index', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    expect(getCell(g, 1, 1)).toBe(1);
  });

  it('returns 0 for a dead cell', () => {
    const g = createGrid(3, 3);
    expect(getCell(g, 0, 0)).toBe(0);
  });

  it('returns 0 for negative x (out-of-bounds)', () => {
    expect(getCell(createGrid(3, 3), -1, 0)).toBe(0);
  });

  it('returns 0 for x >= width (out-of-bounds)', () => {
    expect(getCell(createGrid(3, 3), 3, 0)).toBe(0);
  });

  it('returns 0 for negative y (out-of-bounds)', () => {
    expect(getCell(createGrid(3, 3), 0, -1)).toBe(0);
  });

  it('returns 0 for y >= height (out-of-bounds)', () => {
    expect(getCell(createGrid(3, 3), 0, 3)).toBe(0);
  });
});

describe('setCell', () => {
  it('sets a cell to alive and returns a new Grid', () => {
    const original = createGrid(3, 3);
    const updated = setCell(original, 1, 1, 1);
    expect(getCell(updated, 1, 1)).toBe(1);
    expect(updated).not.toBe(original);
  });

  it('only changes the targeted cell', () => {
    const g = setCell(createGrid(3, 3), 1, 1, 1);
    expect(getCell(g, 0, 0)).toBe(0);
    expect(getCell(g, 2, 2)).toBe(0);
  });

  it('sets a cell to dead (alive = 0)', () => {
    const live = setCell(createGrid(3, 3), 0, 0, 1);
    const dead = setCell(live, 0, 0, 0);
    expect(getCell(dead, 0, 0)).toBe(0);
  });

  it('returns a clone without error when out-of-bounds', () => {
    const g = createGrid(3, 3);
    const result = setCell(g, 5, 5, 1);
    expect(Array.from(result.cells)).toEqual(Array.from(g.cells));
    expect(result).not.toBe(g);
  });
});

describe('toggleCell', () => {
  it('toggles a dead cell to alive', () => {
    const t = toggleCell(createGrid(3, 3), 1, 1);
    expect(getCell(t, 1, 1)).toBe(1);
  });

  it('is its own inverse', () => {
    const t1 = toggleCell(createGrid(3, 3), 1, 1);
    const t2 = toggleCell(t1, 1, 1);
    expect(getCell(t1, 1, 1)).toBe(1);
    expect(getCell(t2, 1, 1)).toBe(0);
  });

  it('returns a clone without error when out-of-bounds', () => {
    const g = createGrid(3, 3);
    const result = toggleCell(g, 99, 99);
    expect(Array.from(result.cells)).toEqual(Array.from(g.cells));
    expect(result).not.toBe(g);
  });
});

describe('clearGrid', () => {
  it('zeroes all cells and returns a new Grid', () => {
    const live = setCell(createGrid(3, 3), 0, 0, 1);
    const cleared = clearGrid(live);
    expect(getCell(cleared, 0, 0)).toBe(0);
    expect(Array.from(cleared.cells)).toEqual(Array(9).fill(0));
    expect(cleared).not.toBe(live);
  });

  it('preserves width and height', () => {
    const g = createGrid(5, 7);
    const cleared = clearGrid(g);
    expect(cleared.width).toBe(5);
    expect(cleared.height).toBe(7);
  });
});

describe('immutability', () => {
  it('setCell never mutates the input grid', () => {
    const original = createGrid(3, 3);
    const snapshot = Array.from(original.cells);
    setCell(original, 1, 1, 1);
    expect(Array.from(original.cells)).toEqual(snapshot);
  });

  it('toggleCell never mutates the input grid', () => {
    const original = createGrid(3, 3);
    const snapshot = Array.from(original.cells);
    toggleCell(original, 1, 1);
    expect(Array.from(original.cells)).toEqual(snapshot);
  });

  it('clearGrid never mutates the input grid', () => {
    const original = setCell(createGrid(3, 3), 1, 1, 1);
    const snapshot = Array.from(original.cells);
    clearGrid(original);
    expect(Array.from(original.cells)).toEqual(snapshot);
  });
});
