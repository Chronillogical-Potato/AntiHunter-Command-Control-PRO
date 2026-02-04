import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TriggerUpdateDto {
  @IsString()
  @IsOptional()
  confirmation?: string; // User must type "UPDATE" to confirm

  @IsBoolean()
  @IsOptional()
  force?: boolean; // Skip some safety checks (admin only)

  @IsBoolean()
  @IsOptional()
  skipBackup?: boolean; // Skip backup creation (not recommended)
}
