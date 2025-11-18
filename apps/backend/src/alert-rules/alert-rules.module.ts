import { Module } from '@nestjs/common';

import { AlertRulesEngineService } from './alert-rules-engine.service';
import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [PrismaModule, MailModule, WsModule, WebhooksModule],
  controllers: [AlertRulesController],
  providers: [AlertRulesService, AlertRulesEngineService],
  exports: [AlertRulesService, AlertRulesEngineService],
})
export class AlertRulesModule {}
