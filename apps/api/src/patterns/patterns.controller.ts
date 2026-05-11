import { Controller, Get, Post, Param, Body, HttpCode } from '@nestjs/common';
import { PatternsService } from './patterns.service';
import { CreatePatternDto } from './dto/create-pattern.dto';

@Controller('patterns')
export class PatternsController {
  constructor(private readonly service: PatternsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePatternDto) {
    return this.service.create(dto);
  }
}
