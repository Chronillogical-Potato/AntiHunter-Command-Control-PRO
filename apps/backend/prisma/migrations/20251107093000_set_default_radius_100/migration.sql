-- Legacy migration to seed the defaultRadiusM fields with a 100m default
-- and make sure both tables have the column. Even if the columns were added
-- earlier, the IF NOT EXISTS guards make this re-runnable.

ALTER TABLE "AppConfig"
ADD COLUMN IF NOT EXISTS "defaultRadiusM" INTEGER;

ALTER TABLE "Site"
ADD COLUMN IF NOT EXISTS "defaultRadiusM" INTEGER;

UPDATE "AppConfig"
SET "defaultRadiusM" = 100
WHERE "defaultRadiusM" IS NULL OR "defaultRadiusM" = 0;

UPDATE "Site"
SET "defaultRadiusM" = 100
WHERE "defaultRadiusM" IS NULL OR "defaultRadiusM" = 0;

ALTER TABLE "AppConfig"
ALTER COLUMN "defaultRadiusM" SET DEFAULT 100;

ALTER TABLE "Site"
ALTER COLUMN "defaultRadiusM" SET DEFAULT 100;
