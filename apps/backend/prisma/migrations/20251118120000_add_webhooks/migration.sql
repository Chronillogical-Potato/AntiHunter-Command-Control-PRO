CREATE TYPE "WebhookEventType" AS ENUM ('ALERT_TRIGGERED');

CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "subscribedEvents" "WebhookEventType"[] DEFAULT ARRAY[]::"WebhookEventType"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertRuleWebhook" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertRuleWebhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "ruleId" TEXT,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "requestPayload" JSONB,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Webhook"
  ADD CONSTRAINT "Webhook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AlertRuleWebhook"
  ADD CONSTRAINT "AlertRuleWebhook_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AlertRuleWebhook_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookDelivery"
  ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WebhookDelivery_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AlertRuleWebhook_ruleId_webhookId_key" ON "AlertRuleWebhook" ("ruleId", "webhookId");
CREATE INDEX "Webhook_ownerId_idx" ON "Webhook" ("ownerId");
CREATE INDEX "Webhook_enabled_idx" ON "Webhook" ("enabled");
CREATE INDEX "AlertRuleWebhook_webhookId_idx" ON "AlertRuleWebhook" ("webhookId");
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery" ("webhookId");
CREATE INDEX "WebhookDelivery_ruleId_idx" ON "WebhookDelivery" ("ruleId");
CREATE INDEX "WebhookDelivery_success_idx" ON "WebhookDelivery" ("success");
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery" ("createdAt");
