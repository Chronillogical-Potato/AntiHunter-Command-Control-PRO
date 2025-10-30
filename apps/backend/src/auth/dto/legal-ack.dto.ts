import { IsBoolean } from 'class-validator';

export class LegalAckDto {
  @IsBoolean()
  accepted!: boolean;
}
