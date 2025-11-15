import { DroneStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDroneStatusDto {
  @IsEnum(DroneStatus)
  status!: DroneStatus;
}
