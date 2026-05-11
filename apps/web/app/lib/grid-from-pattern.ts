import type { Grid, SavedPattern } from '@conways-game-of-life/types';

export function extractLiveCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y * grid.width + x] === 1) cells.push([x, y]);
    }
  }
  return cells;
}

export function gridFromSavedPattern(pattern: SavedPattern): Grid {
  const cells = new Uint8Array(pattern.width * pattern.height);
  for (const [x, y] of pattern.liveCells) {
    if (x >= 0 && x < pattern.width && y >= 0 && y < pattern.height) {
      cells[y * pattern.width + x] = 1;
    }
  }
  return { width: pattern.width, height: pattern.height, cells };
}
