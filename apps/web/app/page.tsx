'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { clearGrid, createGrid, randomizeGrid, step, toggleCell } from '@conways-game-of-life/sim';
import type { Grid } from '@conways-game-of-life/types';
import GridSizeForm from './components/GridSizeForm';

const CELL_PX = 12;

type State = { grid: Grid; genCount: number };
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid }
  | { type: 'toggle'; x: number; y: number }
  | { type: 'clear' }
  | { type: 'randomize' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'resize':
      return { grid: createGrid(action.w, action.h), genCount: 0 };
    case 'tick':
      return { grid: action.next, genCount: state.genCount + 1 };
    case 'toggle':
      return { ...state, grid: toggleCell(state.grid, action.x, action.y) };
    case 'clear':
      return { grid: clearGrid(state.grid), genCount: 0 };
    case 'randomize':
      return { grid: randomizeGrid(state.grid), genCount: 0 };
  }
}

function useSimulationLoop(opts: {
  running: boolean;
  genPerSec: number;
  step: () => void;
}) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const genPerSecRef = useRef(opts.genPerSec);
  genPerSecRef.current = opts.genPerSec;
  const stepRef = useRef(opts.step);
  stepRef.current = opts.step;

  useEffect(() => {
    if (!opts.running) return;
    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;
    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accumulatorRef.current += dt;
      const tickInterval = 1000 / genPerSecRef.current;
      while (accumulatorRef.current >= tickInterval) {
        stepRef.current();
        accumulatorRef.current -= tickInterval;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [opts.running]);
}

export default function Page() {
  const [{ grid, genCount }, dispatch] = useReducer(reducer, undefined, () => ({
    grid: createGrid(30, 30),
    genCount: 0,
  }));
  const [running, setRunning] = useState(false);
  const [genPerSec, setGenPerSec] = useState(10);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const handleTick = useCallback(() => {
    dispatch({ type: 'tick', next: step(gridRef.current) });
  }, []);

  useSimulationLoop({ running, genPerSec, step: handleTick });

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

  function handleStepClick() {
    if (running) return;
    dispatch({ type: 'tick', next: step(grid) });
  }

  function handleClear() {
    setRunning(false);
    dispatch({ type: 'clear' });
  }

  function handleRandomize() {
    setRunning(false);
    dispatch({ type: 'randomize' });
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
        <div className="flex gap-2">
          <button
            onClick={() => setRunning(r => !r)}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {running ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleStepClick}
            disabled={running}
            className="rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Step
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white"
          >
            Clear
          </button>
          <button
            onClick={handleRandomize}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white"
          >
            Randomize
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400">
            Speed: <span className="text-white font-mono">{genPerSec}</span> gen/sec
          </label>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={genPerSec}
            onChange={(e) => setGenPerSec(Number(e.target.value))}
            aria-label="Speed (gen/sec)"
            className="w-full accent-cyan-400"
          />
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
