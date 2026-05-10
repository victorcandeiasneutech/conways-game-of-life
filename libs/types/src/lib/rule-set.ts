import type { Grid } from './grid.js';

export interface RuleSet {
  readonly id: string;
  readonly name: string;
  step(grid: Grid): Grid;
}
