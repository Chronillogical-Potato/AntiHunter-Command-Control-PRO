-- Add two-factor authentication fields to User
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorTempSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorRecoveryCodes" TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
ALTER TABLE "User" ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);
