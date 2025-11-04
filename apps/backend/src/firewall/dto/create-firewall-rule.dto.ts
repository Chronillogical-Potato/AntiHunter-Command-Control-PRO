import { FirewallRuleType } from '@prisma/client';
import { IsIn, IsIP, IsInt, IsOptional, IsString, Min } from 'class-validator';

const RULE_TYPES = Object.values(FirewallRuleType);

export class CreateFirewallRuleDto {
  @IsString()
  @IsIP()
  ip!: string;

  @IsIn(RULE_TYPES)
  type!: FirewallRuleType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  durationSeconds?: number;
}
