-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('CHECKING', 'RUNNING', 'SUCCESS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "UpdatePhase" AS ENUM ('PREFLIGHT', 'GIT_UPDATE', 'DEPENDENCIES', 'DATABASE', 'BUILD', 'RESTART', 'VALIDATION', 'COMPLETE', 'FAILED', 'ROLLING_BACK');

-- CreateTable
CREATE TABLE "UpdateLog" (
    "id" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "fromCommit" TEXT NOT NULL,
    "toCommit" TEXT,
    "status" "UpdateStatus" NOT NULL DEFAULT 'CHECKING',
    "phase" "UpdatePhase",
    "error" TEXT,
    "backupPath" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,

    CONSTRAINT "UpdateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpdateLog_status_startedAt_idx" ON "UpdateLog"("status", "startedAt");

-- CreateIndex
CREATE INDEX "UpdateLog_triggeredById_idx" ON "UpdateLog"("triggeredById");

-- AddForeignKey
ALTER TABLE "UpdateLog" ADD CONSTRAINT "UpdateLog_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
