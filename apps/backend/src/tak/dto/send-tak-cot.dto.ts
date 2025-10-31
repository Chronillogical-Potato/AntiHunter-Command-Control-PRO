import { IsNotEmpty, IsString } from 'class-validator';

export class SendTakCotDto {
  @IsString()
  @IsNotEmpty()
  payload!: string;
}
