import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  honeypot?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  submittedAt?: number;
}
