import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code!: string;
}

export class DisableTwoFactorDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
