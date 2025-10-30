import { IsEmail, IsIn, IsOptional, IsString, IsObject, MaxLength } from 'class-validator';

const THEME_OPTIONS = ['light', 'dark', 'auto'] as const;
type ThemeOption = (typeof THEME_OPTIONS)[number];

const DENSITY_OPTIONS = ['compact', 'comfortable'] as const;
type DensityOption = (typeof DENSITY_OPTIONS)[number];
const TIME_FORMAT_OPTIONS = ['12h', '24h'] as const;
type TimeFormatOption = (typeof TIME_FORMAT_OPTIONS)[number];

export class UpdateCurrentUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(190)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @IsOptional()
  @IsIn(THEME_OPTIONS)
  theme?: ThemeOption;

  @IsOptional()
  @IsIn(DENSITY_OPTIONS)
  density?: DensityOption;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  language?: string;

  @IsOptional()
  @IsObject()
  notifications?: Record<string, unknown>;

  @IsOptional()
  @IsIn(TIME_FORMAT_OPTIONS)
  timeFormat?: TimeFormatOption;
}
