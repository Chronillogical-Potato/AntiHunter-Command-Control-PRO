import { TakProtocol } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateTakConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(TakProtocol)
  protocol?: TakProtocol;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  tlsEnabled?: boolean;

  @IsOptional()
  @IsString()
  cafile?: string;

  @IsOptional()
  @IsString()
  certfile?: string;

  @IsOptional()
  @IsString()
  keyfile?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  streamNodes?: boolean;

  @IsOptional()
  @IsBoolean()
  streamTargets?: boolean;

  @IsOptional()
  @IsBoolean()
  streamCommandAcks?: boolean;

  @IsOptional()
  @IsBoolean()
  streamCommandResults?: boolean;

  @IsOptional()
  @IsBoolean()
  streamAlertInfo?: boolean;

  @IsOptional()
  @IsBoolean()
  streamAlertNotice?: boolean;

  @IsOptional()
  @IsBoolean()
  streamAlertAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  streamAlertCritical?: boolean;
}
