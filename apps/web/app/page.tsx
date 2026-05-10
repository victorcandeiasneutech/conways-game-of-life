'use client';
import { useReducer, useRef, useState } from 'react';
import { createGrid } from '@conways-game-of-life/sim';
import type { Grid } from '@conways-game-of-life/types';
import GridSizeForm from './components/GridSizeForm';

const CELL_PX = 12;

type State = { grid: Grid; genCount: number };
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'resize':
      return { grid: createGrid(action.w, action.h), genCount: 0 };
    case 'tick':
      return { grid: action.next, genCount: state.genCount + 1 };
  }
}

export default function Page() {
  const [{ grid, genCount }, dispatch] = useReducer(reducer, undefined, () => ({
    grid: createGrid(30, 30),
    genCount: 0,
  }));
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function handleResize(w: number, h: number) {
    if (running) setRunning(false);
    dispatch({ type: 'resize', w, h });
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
          className="max-w-full"
          style={{ background: '#0a0a0a' }}
        />
      </main>
    </div>
  );
}
