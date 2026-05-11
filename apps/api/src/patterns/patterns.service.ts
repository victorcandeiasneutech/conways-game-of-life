import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PatternRepository, SavedPattern } from '@conways-game-of-life/types';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';
import { PATTERN_REPOSITORY } from './patterns.constants.js';

@Injectable()
export class PatternsService {
  constructor(
    @Inject(PATTERN_REPOSITORY) private readonly repo: PatternRepository,
  ) {}

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
