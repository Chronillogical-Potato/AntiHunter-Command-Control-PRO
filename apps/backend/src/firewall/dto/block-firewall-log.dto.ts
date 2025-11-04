import { FirewallRuleType } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const BLOCKABLE_RULES: FirewallRuleType[] = ['BLOCK', 'TEMP_BLOCK'];

export class BlockFirewallLogDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsIn(BLOCKABLE_RULES)
  type?: FirewallRuleType;

  @IsOptional()
  @IsInt()
  @Min(60)
  durationSeconds?: number;
}
