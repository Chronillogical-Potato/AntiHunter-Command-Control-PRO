import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FirewallController } from './firewall.controller';
import { FirewallService } from './firewall.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [FirewallController],
  providers: [FirewallService],
  exports: [FirewallService],
})
export class FirewallModule {}
