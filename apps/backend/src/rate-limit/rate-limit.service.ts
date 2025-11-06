import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RateLimitRuleMetadata } from './rate-limit.decorator';

interface StoredCounter {
  count: number;
  expiresAt: number;
}

export interface ResolvedRateLimitRule {
  key: string;
  limit: number;
  ttlMs: number;
  trackAuthFailure: boolean;
  message?: string;
}

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  resetsAt: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly storage = new Map<string, StoredCounter>();
  private readonly defaultLimit: number;
  private readonly defaultTtlMs: number;
  private readonly configuredRules: Record<
    string,
    {
      limit?: number;
      ttlSeconds?: number;
      ttlMs?: number;
      message?: string;
      trackAuthFailure?: boolean;
    }
  >;

  constructor(private readonly configService: ConfigService) {
    this.defaultLimit = this.configService.get<number>('rateLimit.defaultLimit', 300);
    const defaultTtlSeconds = this.configService.get<number>('rateLimit.defaultTtlSeconds', 60);
    this.defaultTtlMs = Math.max(1, defaultTtlSeconds) * 1000;
    this.configuredRules =
      this.configService.get<
        Record<string, { limit?: number; ttlSeconds?: number; ttlMs?: number; message?: string }>
      >('rateLimit.rules', {}) ?? {};
  }

  resolveRule(metadata: RateLimitRuleMetadata): ResolvedRateLimitRule {
    const config = this.configuredRules[metadata.key] ?? {};
    const limit = metadata.limit ?? config.limit ?? this.defaultLimit;
    const configTtlMs =
      typeof config.ttlMs === 'number'
        ? config.ttlMs
        : typeof config.ttlSeconds === 'number'
          ? config.ttlSeconds * 1000
          : undefined;
    const ttlMs =
      metadata.ttlMs ??
      (typeof metadata.ttlSeconds === 'number' ? metadata.ttlSeconds * 1000 : undefined) ??
      configTtlMs ??
      this.defaultTtlMs;

    const resolvedTtl = Math.max(100, Math.floor(ttlMs));
    return {
      key: metadata.key,
      limit: Math.max(1, Math.floor(limit)),
      ttlMs: resolvedTtl,
      trackAuthFailure: metadata.trackAuthFailure ?? config.trackAuthFailure ?? false,
      message: metadata.message ?? config.message,
    };
  }

  consume(key: string, limit: number, ttlMs: number): ConsumeResult {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry || entry.expiresAt <= now) {
      this.storage.set(key, { count: 1, expiresAt: now + ttlMs });
      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        resetsAt: now + ttlMs,
        retryAfterSeconds: Math.ceil(ttlMs / 1000),
      };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetsAt: entry.expiresAt,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
      };
    }

    entry.count += 1;
    this.storage.set(key, entry);
    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.count),
      resetsAt: entry.expiresAt,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
    };
  }
}
