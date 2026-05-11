'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { clearGrid, conwayRules, createGrid, highLifeRules, PATTERNS, placePattern, randomizeGrid, toggleCell } from '@conways-game-of-life/sim';
import type { RuleSet } from '@conways-game-of-life/types';
import type { Grid, NamedPattern, SavedPattern } from '@conways-game-of-life/types';
import { listPatterns, savePattern } from '@conways-game-of-life/api-client';
import GridSizeForm from './components/GridSizeForm';
import SavePatternPanel from './components/SavePatternPanel';
import { extractLiveCells, gridFromSavedPattern } from './lib/grid-from-pattern';

const CELL_PX = 12;
const RULE_SETS: RuleSet[] = [conwayRules, highLifeRules];

type State = { grid: Grid; genCount: number };
type Action =
  | { type: 'resize'; w: number; h: number }
  | { type: 'tick'; next: Grid }
  | { type: 'toggle'; x: number; y: number }
  | { type: 'clear' }
  | { type: 'randomize' }
  | { type: 'place'; grid: Grid };

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
    case 'place':
      return { grid: action.grid, genCount: 0 };
  }
}

function useSimulationLoop(opts: {
  running: boolean;
  genPerSec: number;
  gridRef: { current: Grid };
  onGrid: (next: Grid) => void;
  workerRef: { current: Worker | null };
}) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const genPerSecRef = useRef(opts.genPerSec);
  genPerSecRef.current = opts.genPerSec;
  const pendingRef = useRef(false);
  const runningRef = useRef(opts.running);
  runningRef.current = opts.running;
  const onGridRef = useRef(opts.onGrid);
  onGridRef.current = opts.onGrid;

  // Wire up onmessage when workerRef changes (set once after worker is created)
  useEffect(() => {
    const worker = opts.workerRef.current;
    if (!worker) return;
    worker.onmessage = (e: MessageEvent<{ type: string; buffer: ArrayBuffer; width: number; height: number }>) => {
      pendingRef.current = false;
      if (!runningRef.current) return;
      const { buffer, width, height } = e.data;
      onGridRef.current({ width, height, cells: new Uint8Array(buffer) });
    };
  }, [opts.workerRef]);

  useEffect(() => {
    if (!opts.running) {
      pendingRef.current = false;
      return;
    }
    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;
    pendingRef.current = false;
    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accumulatorRef.current += dt;
      const tickInterval = 1000 / genPerSecRef.current;
      while (accumulatorRef.current >= tickInterval) {
        if (!pendingRef.current && opts.workerRef.current) {
          pendingRef.current = true;
          const grid = opts.gridRef.current;
          const buffer = grid.cells.buffer.slice(0);
          opts.workerRef.current.postMessage(
            { type: 'tick', buffer, width: grid.width, height: grid.height },
            [buffer],
          );
        }
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

function buildPlacedGrid(current: Grid, pattern: NamedPattern): Grid {
  const w = Math.max(current.width, pattern.width);
  const h = Math.max(current.height, pattern.height);
  const base = createGrid(w, h);
  const anchorX = Math.floor((w - pattern.width) / 2);
  const anchorY = Math.floor((h - pattern.height) / 2);
  return placePattern(base, pattern, anchorX, anchorY);
}

export default function Page() {
  const [{ grid, genCount }, dispatch] = useReducer(reducer, undefined, () => ({
    grid: createGrid(30, 30),
    genCount: 0,
  }));
  const [running, setRunning] = useState(false);
  const [genPerSec, setGenPerSec] = useState(10);
  const [ruleSetId, setRuleSetId] = useState<string>('conway');
  const [selectedPatternId, setSelectedPatternId] = useState<string>(PATTERNS[0].id);
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>([]);
  const [saveName, setSaveName] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const workerRef = useRef<Worker | null>(null);

  // Worker lifecycle + OffscreenCanvas transfer (once on mount)
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/sim.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    const canvas = canvasRef.current;
    if (canvas) {
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'init', canvas: offscreen, cellPx: CELL_PX }, [offscreen]);
    }

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Fetch saved patterns on mount (best-effort; fails silently if API is down)
  useEffect(() => {
    listPatterns().then(setSavedPatterns).catch(() => undefined);
  }, []);

  // Notify worker when rule set changes (no grid/gen reset)
  useEffect(() => {
    workerRef.current?.postMessage({ type: 'setRuleSet', id: ruleSetId });
  }, [ruleSetId]);

  // Non-tick renders: send grid to worker for drawing when paused
  useEffect(() => {
    if (running) return;
    const worker = workerRef.current;
    if (!worker) return;
    const buffer = grid.cells.buffer.slice(0);
    worker.postMessage({ type: 'render', buffer, width: grid.width, height: grid.height }, [buffer]);
  }, [grid, running]);

  const handleGrid = useCallback((next: Grid) => {
    dispatch({ type: 'tick', next });
  }, []);

  useSimulationLoop({ running, genPerSec, gridRef, onGrid: handleGrid, workerRef });

  async function handleSave() {
    setApiError(null);
    try {
      const liveCells = extractLiveCells(grid);
      await savePattern({ name: saveName.trim(), width: grid.width, height: grid.height, liveCells });
      setSaveName('');
      const patterns = await listPatterns();
      setSavedPatterns(patterns);
    } catch {
      setApiError('Save failed. Is the API running?');
    }
  }

  function handleLoad(pattern: SavedPattern) {
    setApiError(null);
    setRunning(false);
    dispatch({ type: 'place', grid: gridFromSavedPattern(pattern) });
  }

  function handleResize(w: number, h: number) {
    if (running) setRunning(false);
    dispatch({ type: 'resize', w, h });
  }

  function handleStepClick() {
    if (running) return;
    const activeRule = RULE_SETS.find(r => r.id === ruleSetId) ?? conwayRules;
    dispatch({ type: 'tick', next: activeRule.step(grid) });
  }

  function handleClear() {
    setRunning(false);
    dispatch({ type: 'clear' });
  }

  function handleRandomize() {
    setRunning(false);
    dispatch({ type: 'randomize' });
  }

  function handlePlacePattern() {
    const pattern = PATTERNS.find(p => p.id === selectedPatternId);
    if (!pattern) return;
    setRunning(false);
    dispatch({ type: 'place', grid: buildPlacedGrid(grid, pattern) });
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
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            {running ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleStepClick}
            disabled={running}
            className="rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            Step
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            Clear
          </button>
          <button
            onClick={handleRandomize}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
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
            aria-valuemin={1}
            aria-valuemax={60}
            aria-valuenow={genPerSec}
            className="w-full accent-cyan-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rule-set-select" className="text-sm text-neutral-400">Rule Set</label>
          <select
            id="rule-set-select"
            value={ruleSetId}
            onChange={(e) => setRuleSetId(e.target.value)}
            className="rounded px-2 py-1.5 text-sm bg-neutral-800 text-white border border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {RULE_SETS.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pattern-select" className="text-sm text-neutral-400">Pattern</label>
          <div className="flex gap-2">
            <select
              id="pattern-select"
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              className="flex-1 rounded px-2 py-1.5 text-sm bg-neutral-800 text-white border border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {PATTERNS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handlePlacePattern}
              className="rounded px-3 py-1.5 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              Place
            </button>
          </div>
        </div>
        <GridSizeForm
          currentWidth={grid.width}
          currentHeight={grid.height}
          onResize={handleResize}
        />
        <SavePatternPanel
          saveName={saveName}
          onSaveNameChange={setSaveName}
          onSave={handleSave}
          savedPatterns={savedPatterns}
          onLoad={handleLoad}
          error={apiError}
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
