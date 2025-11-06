import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_RULES_KEY = 'rate-limit:rules';

export interface RateLimitRuleMetadata {
  key: string;
  limit?: number;
  ttlMs?: number;
  ttlSeconds?: number;
  trackAuthFailure?: boolean;
  message?: string;
}

export const RateLimit = (...rules: RateLimitRuleMetadata[]) =>
  SetMetadata(RATE_LIMIT_RULES_KEY, rules);
