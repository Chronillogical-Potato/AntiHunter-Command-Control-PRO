ALTER TABLE "CommandLog"
ADD COLUMN "originSiteId" TEXT;

CREATE INDEX "CommandLog_originSiteId_idx" ON "CommandLog"("originSiteId");
