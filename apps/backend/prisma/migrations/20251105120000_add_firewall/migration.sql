-- CreateEnum
CREATE TYPE "FirewallPolicy" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "FirewallGeoMode" AS ENUM ('DISABLED', 'ALLOW_LIST', 'BLOCK_LIST');

-- CreateEnum
CREATE TYPE "FirewallRuleType" AS ENUM ('ALLOW', 'BLOCK', 'TEMP_BLOCK');

-- CreateEnum
CREATE TYPE "FirewallLogOutcome" AS ENUM ('ALLOWED', 'BLOCKED', 'GEO_BLOCK', 'DEFAULT_DENY', 'AUTH_FAILURE', 'AUTH_SUCCESS');

-- CreateTable
CREATE TABLE "FirewallConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultPolicy" "FirewallPolicy" NOT NULL DEFAULT 'ALLOW',
    "geoMode" "FirewallGeoMode" NOT NULL DEFAULT 'DISABLED',
    "allowedCountries" TEXT[] DEFAULT '{}'::TEXT[],
    "blockedCountries" TEXT[] DEFAULT '{}'::TEXT[],
    "failThreshold" INTEGER NOT NULL DEFAULT 5,
    "failWindowSeconds" INTEGER NOT NULL DEFAULT 900,
    "banDurationSeconds" INTEGER NOT NULL DEFAULT 3600,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirewallConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirewallRule" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "type" "FirewallRuleType" NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirewallRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirewallLog" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "path" TEXT NOT NULL DEFAULT '*',
    "method" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "outcome" "FirewallLogOutcome" NOT NULL,
    "ruleId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "siteId" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirewallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FirewallRule_ip_idx" ON "FirewallRule"("ip");

-- CreateIndex
CREATE INDEX "FirewallLog_ip_idx" ON "FirewallLog"("ip");

-- CreateIndex
CREATE INDEX "FirewallLog_outcome_idx" ON "FirewallLog"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "FirewallLog_ip_outcome_path_key" ON "FirewallLog"("ip", "outcome", "path");

-- AddForeignKey
ALTER TABLE "FirewallLog" ADD CONSTRAINT "FirewallLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
