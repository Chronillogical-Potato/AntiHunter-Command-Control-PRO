import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GeofencesController } from './geofences.controller';
import { GeofencesService } from './geofences.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [GeofencesController],
  providers: [GeofencesService],
  exports: [GeofencesService],
})
export class GeofencesModule {}
