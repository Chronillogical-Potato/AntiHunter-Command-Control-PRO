import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SerialController } from './serial.controller';
import { SerialConfigService } from './serial-config.service';
import { SerialService } from './serial.service';

@Module({
  imports: [PrismaModule],
  providers: [SerialService, SerialConfigService],
  controllers: [SerialController],
  exports: [SerialService, SerialConfigService],
})
export class SerialModule {}
