ALTER TABLE "CommandLog"
ADD COLUMN "originSiteId" TEXT;

CREATE INDEX "CommandLog_originSiteId_idx" ON "CommandLog"("originSiteId");

ALTER TABLE "CommandLog"
ADD CONSTRAINT "CommandLog_originSiteId_fkey" FOREIGN KEY ("originSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
