import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';

import { CommandsService } from './commands.service';
import { SendCommandDto } from './dto/send-command.dto';
import { Roles } from '../auth/auth.decorators';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post('send')
  @Roles(Role.ADMIN, Role.OPERATOR)
  async send(@Req() req: Request, @Body() dto: SendCommandDto) {
    return this.commandsService.sendCommand(dto, req.auth?.sub);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.commandsService.findById(id);
  }
}
