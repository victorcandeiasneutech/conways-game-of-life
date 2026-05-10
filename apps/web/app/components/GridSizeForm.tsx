'use client';
import { useState } from 'react';

interface Props {
  currentWidth: number;
  currentHeight: number;
  onResize: (w: number, h: number) => void;
}

export default function GridSizeForm({ currentWidth, currentHeight, onResize }: Props) {
  const [w, setW] = useState(String(currentWidth));
  const [h, setH] = useState(String(currentHeight));
  const [error, setError] = useState('');

  function validate(val: string): number | null {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 5 || n > 100) return null;
    return n;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vw = validate(w);
    const vh = validate(h);
    if (vw === null || vh === null) {
      setError('Width and height must be integers between 5 and 100.');
      return;
    }
    setError('');
    onResize(vw, vh);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Width
        <input
          type="number"
          min={5}
          max={100}
          value={w}
          onChange={(e) => { setW(e.target.value); setError(''); }}
          className="rounded bg-neutral-800 px-2 py-1 w-20 text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Height
        <input
          type="number"
          min={5}
          max={100}
          value={h}
          onChange={(e) => { setH(e.target.value); setError(''); }}
          className="rounded bg-neutral-800 px-2 py-1 w-20 text-white"
        />
      </label>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        className="rounded bg-cyan-600 px-3 py-1 text-sm hover:bg-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        Resize
      </button>
    </form>
  );
}
