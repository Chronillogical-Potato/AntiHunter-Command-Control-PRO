import { IsNumber } from 'class-validator';

export class GeofenceVertexDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;
}
