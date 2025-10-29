import { PartialType } from '@nestjs/mapped-types';
import { TargetStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateTargetDto } from './create-target.dto';

export class UpdateTargetDto extends PartialType(CreateTargetDto) {
  @IsOptional()
  @IsEnum(TargetStatus)
  status?: TargetStatus;
}
