import { AlertRuleScope } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListAlertRulesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AlertRuleScope)
  scope?: AlertRuleScope;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeAll?: boolean;

  @IsOptional()
  @IsString()
  ownerId?: string;
}
