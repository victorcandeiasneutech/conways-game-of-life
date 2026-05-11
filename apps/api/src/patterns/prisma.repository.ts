import { Injectable } from '@nestjs/common';
import type { PatternRepository, SavedPattern } from '@conways-game-of-life/types';
import { PrismaService } from './prisma.service.js';

type PatternRow = {
  id: string;
  name: string;
  width: number;
  height: number;
  liveCells: string;
  createdAt: Date;
};

@Injectable()
export class SqlitePatternRepository implements PatternRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<SavedPattern[]> {
    const rows = await this.prisma.pattern.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toSavedPattern);
  }

  async get(id: string): Promise<SavedPattern | null> {
    const row = await this.prisma.pattern.findUnique({ where: { id } });
    return row ? toSavedPattern(row) : null;
  }

  async create(input: Omit<SavedPattern, 'id' | 'createdAt'>): Promise<SavedPattern> {
    const row = await this.prisma.pattern.create({
      data: {
        name: input.name,
        width: input.width,
        height: input.height,
        liveCells: JSON.stringify(input.liveCells),
      },
    });
    return toSavedPattern(row);
  }
}

function toSavedPattern(row: PatternRow): SavedPattern {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    liveCells: JSON.parse(row.liveCells) as [number, number][],
    createdAt: row.createdAt.toISOString(),
  };
}
