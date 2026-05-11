import type { SavedPattern } from '@conways-game-of-life/types';

interface Props {
  saveName: string;
  onSaveNameChange: (name: string) => void;
  onSave: () => void;
  savedPatterns: SavedPattern[];
  onLoad: (pattern: SavedPattern) => void;
  error: string | null;
}

export default function SavePatternPanel({
  saveName,
  onSaveNameChange,
  onSave,
  savedPatterns,
  onLoad,
  error,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="save-name" className="text-sm text-neutral-400">Save pattern</label>
        <div className="flex gap-2">
          <input
            id="save-name"
            type="text"
            value={saveName}
            onChange={(e) => onSaveNameChange(e.target.value)}
            placeholder="Pattern name"
            className="flex-1 rounded px-2 py-1.5 text-sm bg-neutral-800 text-white border border-neutral-600 placeholder-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          />
          <button
            onClick={onSave}
            disabled={!saveName.trim()}
            className="rounded px-3 py-1.5 text-sm font-medium bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            Save
          </button>
        </div>
      </div>
      {savedPatterns.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-neutral-400">Saved patterns</span>
          <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {savedPatterns.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onLoad(p)}
                  className="w-full text-left rounded px-2 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">{error}</p>
      )}
    </>
  );
}
