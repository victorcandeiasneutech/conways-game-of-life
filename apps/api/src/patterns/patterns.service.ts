import { Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryPatternRepository } from './in-memory.repository';
import type { SavedPattern } from '@conways-game-of-life/types';
import type { CreatePatternDto } from './dto/create-pattern.dto';

@Injectable()
export class PatternsService {
  constructor(private readonly repo: InMemoryPatternRepository) {}

  list(): Promise<SavedPattern[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<SavedPattern> {
    const pattern = await this.repo.get(id);
    if (!pattern) throw new NotFoundException(`Pattern ${id} not found`);
    return pattern;
  }

  create(dto: CreatePatternDto): Promise<SavedPattern> {
    return this.repo.create(dto);
  }
}
