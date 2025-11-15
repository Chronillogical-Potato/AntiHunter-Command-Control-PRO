import { IsEnum } from 'class-validator';
import { DroneStatus } from '@prisma/client';

export class UpdateDroneStatusDto {
  @IsEnum(DroneStatus)
  status!: DroneStatus;
}
