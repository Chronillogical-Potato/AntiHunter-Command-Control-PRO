-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "caBundle" TEXT,
ADD COLUMN     "clientCert" TEXT,
ADD COLUMN     "clientKey" TEXT,
ADD COLUMN     "verifyTls" BOOLEAN NOT NULL DEFAULT true;
