import { Injectable } from '@nestjs/common';
import type { PatternRepository, SavedPattern } from '@conways-game-of-life/types';

@Injectable()
export class InMemoryPatternRepository implements PatternRepository {
  private readonly store = new Map<string, SavedPattern>();

  async list(): Promise<SavedPattern[]> {
    return [...this.store.values()];
  }

  async get(id: string): Promise<SavedPattern | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: Omit<SavedPattern, 'id' | 'createdAt'>): Promise<SavedPattern> {
    const pattern: SavedPattern = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.store.set(pattern.id, pattern);
    return pattern;
  }
}
