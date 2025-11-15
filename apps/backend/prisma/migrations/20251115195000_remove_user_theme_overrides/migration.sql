-- Drop per-user theme override columns now that presets are required.
ALTER TABLE "UserPreference"
  DROP COLUMN IF EXISTS "themeAccentPrimary",
  DROP COLUMN IF EXISTS "themeLightBackground",
  DROP COLUMN IF EXISTS "themeLightSurface",
  DROP COLUMN IF EXISTS "themeLightText",
  DROP COLUMN IF EXISTS "themeDarkBackground",
  DROP COLUMN IF EXISTS "themeDarkSurface",
  DROP COLUMN IF EXISTS "themeDarkText";
