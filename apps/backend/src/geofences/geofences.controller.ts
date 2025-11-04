import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';

import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { ListGeofencesDto } from './dto/list-geofences.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { GeofencesService } from './geofences.service';
import { Roles } from '../auth/auth.decorators';

@Controller('geofences')
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Get()
  list(@Query() query: ListGeofencesDto) {
    return this.geofencesService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.geofencesService.getById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  create(@Req() req: Request, @Body() dto: CreateGeofenceDto) {
    return this.geofencesService.create(dto, req.auth?.sub);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  update(@Param('id') id: string, @Body() dto: UpdateGeofenceDto) {
    return this.geofencesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  delete(@Param('id') id: string) {
    return this.geofencesService.delete(id);
  }
}
