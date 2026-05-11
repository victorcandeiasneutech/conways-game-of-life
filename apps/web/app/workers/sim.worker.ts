import { conwayRules, highLifeRules } from '@conways-game-of-life/sim';
import type { Grid } from '@conways-game-of-life/types';

let activeStep: (grid: Grid) => Grid = conwayRules.step;

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let storedCanvas: OffscreenCanvas | null = null;
let cellPx = 12;

function renderGrid(cells: Uint8Array, width: number, height: number) {
  if (!ctx || !storedCanvas) return;
  if (storedCanvas.width !== width * cellPx) storedCanvas.width = width * cellPx;
  if (storedCanvas.height !== height * cellPx) storedCanvas.height = height * cellPx;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width * cellPx, height * cellPx);
  ctx.fillStyle = '#22d3ee';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x] === 1) {
        ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      }
    }
  }
}

type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; cellPx: number }
  | { type: 'tick'; buffer: ArrayBuffer; width: number; height: number }
  | { type: 'render'; buffer: ArrayBuffer; width: number; height: number }
  | { type: 'setRuleSet'; id: string };

type WorkerResponse = { type: 'grid'; buffer: ArrayBuffer; width: number; height: number };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    storedCanvas = msg.canvas;
    cellPx = msg.cellPx;
    ctx = storedCanvas.getContext('2d');
  } else if (msg.type === 'tick') {
    const { buffer, width, height } = msg;
    const next = activeStep({ width, height, cells: new Uint8Array(buffer) });
    renderGrid(next.cells, next.width, next.height);
    const response: WorkerResponse = { type: 'grid', buffer: next.cells.buffer as ArrayBuffer, width: next.width, height: next.height };
    self.postMessage(
      response,
      [next.cells.buffer],
    );
  } else if (msg.type === 'render') {
    const { buffer, width, height } = msg;
    renderGrid(new Uint8Array(buffer), width, height);
  } else if (msg.type === 'setRuleSet') {
    activeStep = msg.id === 'highlife' ? highLifeRules.step : conwayRules.step;
  }
};
