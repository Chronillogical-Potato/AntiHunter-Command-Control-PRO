import { UpdateStatus, UpdatePhase } from '../update.types';

export class UpdateStatusDto {
  status!: UpdateStatus;
  phase?: UpdatePhase;
  progress?: number;
  currentStep?: string;
  error?: string;
  startedAt?: string;
  estimatedCompletionAt?: string;
}
