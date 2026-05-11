import type { Grid, NamedPattern } from '@conways-game-of-life/types';

export const block: NamedPattern = {
  id: 'block',
  name: 'Block',
  width: 2,
  height: 2,
  liveCells: [[0, 0], [1, 0], [0, 1], [1, 1]],
};

export const blinker: NamedPattern = {
  id: 'blinker',
  name: 'Blinker',
  width: 3,
  height: 1,
  liveCells: [[0, 0], [1, 0], [2, 0]],
};

export const glider: NamedPattern = {
  id: 'glider',
  name: 'Glider',
  width: 3,
  height: 3,
  liveCells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
};

// Gosper Glider Gun — 36×9, 36 live cells
// RLE: 24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$
//      2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o
export const gosperGliderGun: NamedPattern = {
  id: 'gosperGliderGun',
  name: 'Gosper Glider Gun',
  width: 36,
  height: 9,
  liveCells: [
    [24, 0],
    [22, 1], [24, 1],
    [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
    [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
    [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4],
    [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
    [10, 6], [16, 6], [24, 6],
    [11, 7], [15, 7],
    [12, 8], [13, 8],
  ],
};

export const PATTERNS: ReadonlyArray<NamedPattern> = [block, blinker, glider, gosperGliderGun];

export function placePattern(
  grid: Grid,
  pattern: NamedPattern,
  anchorX: number,
  anchorY: number,
): Grid {
  const cells = new Uint8Array(grid.cells);
  for (const [dx, dy] of pattern.liveCells) {
    const x = anchorX + dx;
    const y = anchorY + dy;
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
      cells[y * grid.width + x] = 1;
    }
  }
  return { width: grid.width, height: grid.height, cells };
}
