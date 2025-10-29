import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CreateTargetDto } from './dto/create-target.dto';
import { ListTargetsDto } from './dto/list-targets.dto';
import { UpdateTargetDto } from './dto/update-target.dto';
import { TargetsService } from './targets.service';

@Controller('targets')
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  @Get()
  list(@Query() query: ListTargetsDto) {
    return this.targetsService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.targetsService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateTargetDto) {
    return this.targetsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTargetDto) {
    return this.targetsService.update(id, dto);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.targetsService.resolve(id, notes);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.targetsService.delete(id);
  }

  @Delete('clear')
  clearAll() {
    return this.targetsService.clearAll();
  }
}
