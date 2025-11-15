-- Add theme customization columns with sensible defaults
ALTER TABLE "AppConfig"
  ADD COLUMN "themeLightBackground" TEXT NOT NULL DEFAULT '#f3f4f6',
  ADD COLUMN "themeLightSurface" TEXT NOT NULL DEFAULT '#ffffff',
  ADD COLUMN "themeLightText" TEXT NOT NULL DEFAULT '#1F2933',
  ADD COLUMN "themeDarkBackground" TEXT NOT NULL DEFAULT '#0F172A',
  ADD COLUMN "themeDarkSurface" TEXT NOT NULL DEFAULT '#111C32',
  ADD COLUMN "themeDarkText" TEXT NOT NULL DEFAULT '#E2E8F0',
  ADD COLUMN "themeAccentPrimary" TEXT NOT NULL DEFAULT '#2563EB';
