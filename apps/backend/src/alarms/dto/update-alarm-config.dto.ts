import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateAlarmConfigDto {
  @IsString()
  audioPack!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  volumeInfo!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  volumeNotice!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  volumeAlert!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  volumeCritical!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  volumeDroneGeofence!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  volumeDroneTelemetry!: number;

  @IsInt()
  @Min(0)
  gapInfoMs!: number;

  @IsInt()
  @Min(0)
  gapNoticeMs!: number;

  @IsInt()
  @Min(0)
  gapAlertMs!: number;

  @IsInt()
  @Min(0)
  gapCriticalMs!: number;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  dndStart?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  dndEnd?: string;

  @IsBoolean()
  backgroundAllowed!: boolean;
}
