ALTER TABLE "Drone" ADD COLUMN "originSiteId" TEXT;

CREATE INDEX "Drone_originSiteId_idx" ON "Drone"("originSiteId");

ALTER TABLE "Drone"
  ADD CONSTRAINT "Drone_originSiteId_fkey"
  FOREIGN KEY ("originSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
