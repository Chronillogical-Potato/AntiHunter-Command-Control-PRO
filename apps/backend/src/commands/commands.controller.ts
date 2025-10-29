import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CommandsService } from './commands.service';
import { SendCommandDto } from './dto/send-command.dto';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post('send')
  async send(@Body() dto: SendCommandDto) {
    return this.commandsService.sendCommand(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.commandsService.findById(id);
  }
}
