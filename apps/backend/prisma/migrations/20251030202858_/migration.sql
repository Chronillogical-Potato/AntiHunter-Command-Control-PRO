DO $$
BEGIN
  IF to_regclass('public."PasswordResetToken"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
    ) THEN
      ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."UserPermission"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserPermission_userId_fkey'
    ) THEN
      ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_userId_fkey";
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."UserSiteAccess"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserSiteAccess_siteId_fkey'
    ) THEN
      ALTER TABLE "UserSiteAccess" DROP CONSTRAINT "UserSiteAccess_siteId_fkey";
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserSiteAccess_userId_fkey'
    ) THEN
      ALTER TABLE "UserSiteAccess" DROP CONSTRAINT "UserSiteAccess_userId_fkey";
    END IF;
  END IF;
END;
$$;

ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "alertColorAlert" TEXT NOT NULL DEFAULT '#F97316';
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "alertColorCritical" TEXT NOT NULL DEFAULT '#EF4444';
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "alertColorIdle" TEXT NOT NULL DEFAULT '#38BDF8';
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "alertColorInfo" TEXT NOT NULL DEFAULT '#2563EB';
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "alertColorNotice" TEXT NOT NULL DEFAULT '#22C55E';

DO $$
BEGIN
  IF to_regclass('public."UserPermission"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserPermission'
        AND column_name = 'updatedAt'
        AND column_default IS NOT NULL
    ) THEN
      ALTER TABLE "UserPermission" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."UserSiteAccess"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserSiteAccess'
        AND column_name = 'updatedAt'
        AND column_default IS NOT NULL
    ) THEN
      ALTER TABLE "UserSiteAccess" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."UserPermission"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserPermission_userId_fkey'
    ) THEN
      ALTER TABLE "UserPermission"
        ADD CONSTRAINT "UserPermission_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."UserSiteAccess"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserSiteAccess_userId_fkey'
    ) THEN
      ALTER TABLE "UserSiteAccess"
        ADD CONSTRAINT "UserSiteAccess_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserSiteAccess_siteId_fkey'
    ) THEN
      ALTER TABLE "UserSiteAccess"
        ADD CONSTRAINT "UserSiteAccess_siteId_fkey"
        FOREIGN KEY ("siteId") REFERENCES "Site"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."PasswordResetToken"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
    ) THEN
      ALTER TABLE "PasswordResetToken"
        ADD CONSTRAINT "PasswordResetToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END;
$$;
