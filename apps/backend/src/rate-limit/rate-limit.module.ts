import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { FirewallModule } from '../firewall/firewall.module';

@Module({
  imports: [ConfigModule, FirewallModule],
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
