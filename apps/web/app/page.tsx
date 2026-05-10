'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { createGrid, toggleCell } from '@conways-game-of-life/sim';
import type { Grid } from '@conways-game-of-life/types';
import GridSizeForm from './components/GridSizeForm';

const CELL_PX = 12;

type State = { grid: Grid; genCount: number };
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid }
  | { type: 'toggle'; x: number; y: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'resize':
      return { grid: createGrid(action.w, action.h), genCount: 0 };
    case 'tick':
      return { grid: action.next, genCount: state.genCount + 1 };
    case 'toggle':
      return { ...state, grid: toggleCell(state.grid, action.x, action.y) };
  }
}

export default function Page() {
  const [{ grid, genCount }, dispatch] = useReducer(reducer, undefined, () => ({
    grid: createGrid(30, 30),
    genCount: 0,
  }));
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, grid.width * CELL_PX, grid.height * CELL_PX);
    ctx.fillStyle = '#22d3ee';
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y * grid.width + x] === 1) {
          ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
        }
      }
    }
  }, [grid]);

  function handleResize(w: number, h: number) {
    if (running) setRunning(false);
    dispatch({ type: 'resize', w, h });
  }

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (running) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = grid.width / rect.width;
    const scaleY = grid.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    dispatch({ type: 'toggle', x, y });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-neutral-950 text-white">
      <aside className="flex flex-col gap-4 lg:w-64">
        <h1 className="text-lg font-semibold text-cyan-400">Conway&apos;s Game of Life</h1>
        <div className="flex flex-col gap-1 text-sm text-neutral-400">
          <span>Generation: <span data-testid="gen-count" className="text-white font-mono">{genCount}</span></span>
          <span>Grid: {grid.width} × {grid.height}</span>
        </div>
        <GridSizeForm
          currentWidth={grid.width}
          currentHeight={grid.height}
          onResize={handleResize}
        />
      </aside>
      <main className="flex-1 flex items-start justify-center">
        <canvas
          ref={canvasRef}
          width={grid.width * CELL_PX}
          height={grid.height * CELL_PX}
          className="max-w-full cursor-crosshair"
          style={{ background: '#0a0a0a' }}
          onPointerDown={handleCanvasPointerDown}
        />
      </main>
    </div>
  );
}
