export class UpdateInfoDto {
  available!: boolean;
  currentCommit!: string;
  currentBranch?: string;
  latestCommit?: string;
  commitsBehind?: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  lastCommitAuthor?: string;
  lastCheckAt!: string;
  canUpdate!: boolean;
  blockers?: string[];
}
