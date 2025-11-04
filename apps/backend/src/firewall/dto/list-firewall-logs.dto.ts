import { FirewallLogOutcome } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const LOG_OUTCOMES = Object.values(FirewallLogOutcome);

export class ListFirewallLogsDto {
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  })
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsIn(LOG_OUTCOMES)
  outcome?: FirewallLogOutcome;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true';
    }
    return undefined;
  })
  @IsBoolean()
  onlyBlocked?: boolean;
}
