import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhooksService } from './webhooks.service';

interface RequestAuth {
  userId: string;
  role: Role;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  list(@Req() req: Request) {
    const auth = this.requireAuth(req);
    return this.webhooksService.list(auth.userId, auth.role);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateWebhookDto) {
    const auth = this.requireAuth(req);
    return this.webhooksService.create(auth.userId, auth.role, dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    const auth = this.requireAuth(req);
    return this.webhooksService.update(id, auth.userId, auth.role, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const auth = this.requireAuth(req);
    return this.webhooksService.remove(id, auth.userId, auth.role);
  }

  @Post(':id/test')
  test(@Req() req: Request, @Param('id') id: string) {
    const auth = this.requireAuth(req);
    return this.webhooksService.triggerTest(id, auth.userId, auth.role);
  }

  private requireAuth(req: Request): RequestAuth {
    const payload = req.auth;
    if (!payload?.sub) {
      throw new UnauthorizedException('Missing authentication context');
    }
    return { userId: payload.sub, role: payload.role };
  }
}
