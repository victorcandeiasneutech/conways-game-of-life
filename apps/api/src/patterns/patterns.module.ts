import { Module } from '@nestjs/common';
import { PatternsController } from './patterns.controller';
import { PatternsService } from './patterns.service';
import { InMemoryPatternRepository } from './in-memory.repository';

@Module({
  controllers: [PatternsController],
  providers: [PatternsService, InMemoryPatternRepository],
})
export class PatternsModule {}
