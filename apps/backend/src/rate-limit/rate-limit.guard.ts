import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

import { RATE_LIMIT_RULES_KEY, RateLimitRuleMetadata } from './rate-limit.decorator';
import { RateLimitService } from './rate-limit.service';
import { FirewallService } from '../firewall/firewall.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly firewallService: FirewallService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules =
      this.reflector.getAllAndOverride<RateLimitRuleMetadata[]>(RATE_LIMIT_RULES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (rules.length === 0) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const path = request.path ?? request.url ?? '';
    const userAgent = request.headers['user-agent'] as string | undefined;
    const ip = this.firewallService.getClientIp(request) ?? request.ip ?? 'unknown';

    for (const metadata of rules) {
      const resolved = this.rateLimitService.resolveRule(metadata);
      const storageKey = `${resolved.key}:${ip}`;
      const result = this.rateLimitService.consume(storageKey, resolved.limit, resolved.ttlMs);

      if (!result.allowed) {
        if (response && result.retryAfterSeconds) {
          response.setHeader('Retry-After', result.retryAfterSeconds.toString());
        }

        if (resolved.trackAuthFailure && ip && path.startsWith('/auth')) {
          await this.firewallService.registerAuthFailure(ip, {
            reason: 'RATE_LIMIT',
            path,
            userAgent,
          });
        }

        throw new HttpException(
          resolved.message ?? 'Too many requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
