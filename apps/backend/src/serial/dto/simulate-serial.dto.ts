import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SimulateSerialDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  lines!: string[];
}
