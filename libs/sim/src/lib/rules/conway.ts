import type { Grid, RuleSet } from '@conways-game-of-life/types';

export function step(grid: Grid): Grid {
  const { width, height, cells } = grid;
  const next = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors += cells[ny * width + nx];
          }
        }
      }
      const alive = cells[y * width + x];
      next[y * width + x] =
        alive === 1
          ? (neighbors === 2 || neighbors === 3 ? 1 : 0)
          : (neighbors === 3 ? 1 : 0);
    }
  }
  return { width, height, cells: next };
}

export const conwayRules: RuleSet = {
  id: 'conway',
  name: "Conway's Game of Life",
  step,
};
