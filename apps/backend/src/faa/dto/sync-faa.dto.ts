import { IsOptional, IsString, IsUrl } from 'class-validator';

export class SyncFaaRegistryDto {
  @IsOptional()
  @IsString()
  @IsUrl()
  url?: string;
}
