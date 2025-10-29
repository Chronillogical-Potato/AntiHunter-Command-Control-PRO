import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateAppSettingsDto {
  @IsOptional()
  @IsString()
  appName?: string;

  @IsOptional()
  @IsString()
  protocol?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  env?: string;

  @IsOptional()
  @IsString()
  detectChannels?: string;

  @IsOptional()
  @IsInt()
  detectMode?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  detectScanSecs?: number;

  @IsOptional()
  @IsBoolean()
  allowForever?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  baselineSecs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deviceScanSecs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  droneSecs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  randomizeSecs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deauthSecs?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(2000)
  defaultRadiusM?: number;

  @IsOptional()
  @IsString()
  mapTileUrl?: string;

  @IsOptional()
  @IsString()
  mapAttribution?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minZoom?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxZoom?: number;
}
