-- AlterTable
ALTER TABLE "TakConfig"
ADD COLUMN "streamNodes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "streamTargets" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "streamCommandAcks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "streamCommandResults" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "streamAlertInfo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "streamAlertNotice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "streamAlertAlert" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "streamAlertCritical" BOOLEAN NOT NULL DEFAULT true;

UPDATE "TakConfig"
SET
  "streamNodes" = COALESCE("streamNodes", true),
  "streamTargets" = COALESCE("streamTargets", true),
  "streamCommandAcks" = COALESCE("streamCommandAcks", false),
  "streamCommandResults" = COALESCE("streamCommandResults", false),
  "streamAlertInfo" = COALESCE("streamAlertInfo", false),
  "streamAlertNotice" = COALESCE("streamAlertNotice", true),
  "streamAlertAlert" = COALESCE("streamAlertAlert", true),
  "streamAlertCritical" = COALESCE("streamAlertCritical", true)
WHERE "id" = 1;
