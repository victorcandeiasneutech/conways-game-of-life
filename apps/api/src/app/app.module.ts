import { Module } from '@nestjs/common';
import { PatternsModule } from '../patterns/patterns.module';

@Module({
  imports: [PatternsModule],
})
export class AppModule {}
