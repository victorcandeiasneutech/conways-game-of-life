import type { Grid } from '@conways-game-of-life/types';

export function createGrid(width: number, height: number): Grid {
  if (width <= 0 || height <= 0) {
    throw new RangeError(`Grid dimensions must be positive, got ${width}x${height}`);
  }
  return { width, height, cells: new Uint8Array(width * height) };
}

export function cloneGrid(grid: Grid): Grid {
  return { width: grid.width, height: grid.height, cells: new Uint8Array(grid.cells) };
}

export function getCell(grid: Grid, x: number, y: number): 0 | 1 {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return 0;
  return grid.cells[y * grid.width + x] as 0 | 1;
}

export function setCell(grid: Grid, x: number, y: number, alive: 0 | 1): Grid {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return cloneGrid(grid);
  const cells = new Uint8Array(grid.cells);
  cells[y * grid.width + x] = alive;
  return { width: grid.width, height: grid.height, cells };
}

export function toggleCell(grid: Grid, x: number, y: number): Grid {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return cloneGrid(grid);
  const current = grid.cells[y * grid.width + x];
  return setCell(grid, x, y, current === 0 ? 1 : 0);
}

export function clearGrid(grid: Grid): Grid {
  return { width: grid.width, height: grid.height, cells: new Uint8Array(grid.width * grid.height) };
}
