import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';

import { GeofenceAlarmConfigDto } from './alarm-config.dto';
import { CreateGeofenceDto } from './create-geofence.dto';
import { GeofenceVertexDto } from './geofence-vertex.dto';

export class UpdateGeofenceDto extends PartialType(CreateGeofenceDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeofenceVertexDto)
  @ArrayMinSize(3)
  override polygon?: GeofenceVertexDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GeofenceAlarmConfigDto)
  override alarm?: GeofenceAlarmConfigDto;
}
