import { Module } from '@nestjs/common';
import { PatternsController } from './patterns.controller.js';
import { PatternsService } from './patterns.service.js';
import { PrismaService } from './prisma.service.js';
import { SqlitePatternRepository } from './prisma.repository.js';
import { PATTERN_REPOSITORY } from './patterns.constants.js';

@Module({
  controllers: [PatternsController],
  providers: [
    PrismaService,
    SqlitePatternRepository,
    { provide: PATTERN_REPOSITORY, useExisting: SqlitePatternRepository },
    PatternsService,
  ],
})
export class PatternsModule {}
