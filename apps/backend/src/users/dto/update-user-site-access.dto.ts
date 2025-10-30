import { SiteAccessLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SiteAccessAssignmentDto {
  @IsString()
  siteId!: string;

  @IsEnum(SiteAccessLevel)
  level!: SiteAccessLevel;
}

export class UpdateUserSiteAccessDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteAccessAssignmentDto)
  siteAccess?: SiteAccessAssignmentDto[];
}
