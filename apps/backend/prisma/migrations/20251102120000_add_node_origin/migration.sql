-- Add originSiteId column to Node table and index for lookup.
ALTER TABLE "Node"
ADD COLUMN "originSiteId" TEXT;

CREATE INDEX "Node_originSiteId_idx" ON "Node"("originSiteId");

ALTER TABLE "Node"
ADD CONSTRAINT "Node_originSiteId_fkey" FOREIGN KEY ("originSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
