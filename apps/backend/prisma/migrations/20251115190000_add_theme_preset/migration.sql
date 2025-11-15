-- Add theme preset selection per user
ALTER TABLE "UserPreference"
  ADD COLUMN "themePreset" TEXT NOT NULL DEFAULT 'classic';
