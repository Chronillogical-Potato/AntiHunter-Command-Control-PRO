-- Add per-user theme and alert color overrides
ALTER TABLE "UserPreference"
  ADD COLUMN "themeAccentPrimary" TEXT,
  ADD COLUMN "themeLightBackground" TEXT,
  ADD COLUMN "themeLightSurface" TEXT,
  ADD COLUMN "themeLightText" TEXT,
  ADD COLUMN "themeDarkBackground" TEXT,
  ADD COLUMN "themeDarkSurface" TEXT,
  ADD COLUMN "themeDarkText" TEXT,
  ADD COLUMN "alertColorIdle" TEXT,
  ADD COLUMN "alertColorInfo" TEXT,
  ADD COLUMN "alertColorNotice" TEXT,
  ADD COLUMN "alertColorAlert" TEXT,
  ADD COLUMN "alertColorCritical" TEXT;
