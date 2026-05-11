export interface SavedPattern {
  id: string;
  name: string;
  width: number;
  height: number;
  liveCells: ReadonlyArray<readonly [number, number]>;
  createdAt: string; // ISO 8601
}

export interface PatternRepository {
  list(): Promise<SavedPattern[]>;
  get(id: string): Promise<SavedPattern | null>;
  create(input: Omit<SavedPattern, 'id' | 'createdAt'>): Promise<SavedPattern>;
}
