import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { SerialModule } from '../serial/serial.module';

@Module({
  imports: [SerialModule, ConfigModule],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}
