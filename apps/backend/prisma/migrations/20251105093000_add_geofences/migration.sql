DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlarmLevel') THEN
        CREATE TYPE "AlarmLevel" AS ENUM ('INFO', 'NOTICE', 'ALERT', 'CRITICAL');
    END IF;
END;
$$ LANGUAGE plpgsql;

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

CREATE INDEX "Geofence_siteId_idx" ON "Geofence"("siteId");
CREATE INDEX "Geofence_originSiteId_idx" ON "Geofence"("originSiteId");
CREATE INDEX "Geofence_updatedAt_idx" ON "Geofence"("updatedAt");

ALTER TABLE "Geofence"
    ADD CONSTRAINT "Geofence_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
