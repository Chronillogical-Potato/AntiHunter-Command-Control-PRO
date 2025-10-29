import { Module } from '@nestjs/common';

import { AlarmsController } from './alarms.controller';
import { AlarmsService } from './alarms.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AlarmsController],
  providers: [AlarmsService],
  exports: [AlarmsService],
})
export class AlarmsModule {}
