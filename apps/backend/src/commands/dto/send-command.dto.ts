import { IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class SendCommandDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  siteId?: string;

  @IsString()
  @Length(1, 64)
  target!: string;

  @IsString()
  @Length(1, 64)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  params: string[] = [];

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
