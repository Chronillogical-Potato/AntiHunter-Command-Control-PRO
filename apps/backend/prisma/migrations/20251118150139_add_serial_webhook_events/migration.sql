-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WebhookEventType" ADD VALUE 'NODE_TELEMETRY';
ALTER TYPE "WebhookEventType" ADD VALUE 'TARGET_DETECTED';
ALTER TYPE "WebhookEventType" ADD VALUE 'NODE_ALERT';
ALTER TYPE "WebhookEventType" ADD VALUE 'DRONE_TELEMETRY';
ALTER TYPE "WebhookEventType" ADD VALUE 'COMMAND_ACK';
ALTER TYPE "WebhookEventType" ADD VALUE 'COMMAND_RESULT';
ALTER TYPE "WebhookEventType" ADD VALUE 'SERIAL_RAW';
