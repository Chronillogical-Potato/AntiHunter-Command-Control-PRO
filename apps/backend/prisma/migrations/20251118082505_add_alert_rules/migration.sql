-- CreateEnum
CREATE TYPE "AlertRuleScope" AS ENUM ('PERSONAL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "AlertRuleMatchMode" AS ENUM ('ANY', 'ALL');

-- AlterTable
ALTER TABLE "AppConfig" ALTER COLUMN "protocol" SET DEFAULT 'meshtastic-rewrite';

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "AlertRuleScope" NOT NULL DEFAULT 'PERSONAL',
    "ownerId" TEXT,
    "severity" "AlarmLevel" NOT NULL DEFAULT 'ALERT',
    "matchMode" "AlertRuleMatchMode" NOT NULL DEFAULT 'ANY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ouiPrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ssids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channels" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "macAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inventoryMacs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minRssi" INTEGER,
    "maxRssi" INTEGER,
    "notifyVisual" BOOLEAN NOT NULL DEFAULT true,
    "notifyAudible" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "emailRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "messageTemplate" TEXT,
    "mapStyle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "nodeId" TEXT,
    "mac" TEXT,
    "ssid" TEXT,
    "channel" INTEGER,
    "rssi" INTEGER,
    "payload" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertRule_ownerId_idx" ON "AlertRule"("ownerId");

-- CreateIndex
CREATE INDEX "AlertRule_scope_idx" ON "AlertRule"("scope");

-- CreateIndex
CREATE INDEX "AlertRule_isActive_idx" ON "AlertRule"("isActive");

-- CreateIndex
CREATE INDEX "AlertRule_lastTriggeredAt_idx" ON "AlertRule"("lastTriggeredAt");

-- CreateIndex
CREATE INDEX "AlertEvent_ruleId_idx" ON "AlertEvent"("ruleId");

-- CreateIndex
CREATE INDEX "AlertEvent_triggeredAt_idx" ON "AlertEvent"("triggeredAt");

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
