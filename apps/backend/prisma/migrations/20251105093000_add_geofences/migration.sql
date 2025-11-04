-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "originSiteId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1d4ed8',
    "polygon" JSONB NOT NULL,
    "alarmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alarmLevel" "AlarmLevel" NOT NULL DEFAULT 'ALERT',
    "alarmMessage" TEXT NOT NULL DEFAULT '{entity} entered geofence {geofence}',
    "alarmTriggerOnExit" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Geofence_siteId_idx" ON "Geofence"("siteId");

-- CreateIndex
CREATE INDEX "Geofence_originSiteId_idx" ON "Geofence"("originSiteId");

-- CreateIndex
CREATE INDEX "Geofence_updatedAt_idx" ON "Geofence"("updatedAt");

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
