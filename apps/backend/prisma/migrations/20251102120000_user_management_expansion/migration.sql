DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SiteAccessLevel') THEN
    CREATE TYPE "SiteAccessLevel" AS ENUM ('VIEW', 'MANAGE');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS "UserPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserSiteAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "level" "SiteAccessLevel" NOT NULL DEFAULT 'VIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSiteAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "siteIds" TEXT[] NOT NULL,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "message" TEXT,
  "inviterId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- Ensure defaults exist in case table was created without them
DO $$
BEGIN
  IF to_regclass('public."UserPermission"') IS NOT NULL THEN
    ALTER TABLE "UserPermission"
      ALTER COLUMN "granted" SET DEFAULT true,
      ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
      ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF to_regclass('public."UserSiteAccess"') IS NOT NULL THEN
    ALTER TABLE "UserSiteAccess"
      ALTER COLUMN "level" SET DEFAULT 'VIEW',
      ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
      ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF to_regclass('public."UserInvitation"') IS NOT NULL THEN
    ALTER TABLE "UserInvitation"
      ALTER COLUMN "permissions" SET DEFAULT ARRAY[]::TEXT[],
      ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_userId_feature_key" ON "UserPermission" ("userId", "feature");
CREATE UNIQUE INDEX IF NOT EXISTS "UserSiteAccess_userId_siteId_key" ON "UserSiteAccess" ("userId", "siteId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserInvitation_token_key" ON "UserInvitation" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken" ("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken" ("userId");

DO $$
BEGIN
  IF to_regclass('public."UserPermission"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserPermission_userId_fkey'
    ) THEN
      ALTER TABLE "UserPermission"
        ADD CONSTRAINT "UserPermission_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
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
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserSiteAccess_siteId_fkey'
    ) THEN
      ALTER TABLE "UserSiteAccess"
        ADD CONSTRAINT "UserSiteAccess_siteId_fkey"
        FOREIGN KEY ("siteId") REFERENCES "Site"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public."UserInvitation"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'UserInvitation_inviterId_fkey'
    ) THEN
      ALTER TABLE "UserInvitation"
        ADD CONSTRAINT "UserInvitation_inviterId_fkey"
        FOREIGN KEY ("inviterId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
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
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END;
$$;
