import { IsBooleanString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
