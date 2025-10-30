-- Add mail/server configuration columns to AppConfig
ALTER TABLE "AppConfig"
ADD COLUMN "mailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mailHost" TEXT,
ADD COLUMN "mailPort" INTEGER DEFAULT 587,
ADD COLUMN "mailSecure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mailUser" TEXT,
ADD COLUMN "mailPassword" TEXT,
ADD COLUMN "mailFrom" TEXT NOT NULL DEFAULT 'Command Center <no-reply@command-center.local>',
ADD COLUMN "mailPreview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "securityAppUrl" TEXT NOT NULL DEFAULT 'http://localhost:5173',
ADD COLUMN "invitationExpiryHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN "passwordResetExpiryHours" INTEGER NOT NULL DEFAULT 4;

