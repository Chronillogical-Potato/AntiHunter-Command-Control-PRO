-- AlterTable
ALTER TABLE "Target"
ADD COLUMN "mac" TEXT,
ADD COLUMN "deviceType" TEXT,
ADD COLUMN "firstNodeId" TEXT;

-- AlterTable
ALTER TABLE "InventoryDevice"
ADD COLUMN "lastNodeId" TEXT,
ADD COLUMN "lastLat" DOUBLE PRECISION,
ADD COLUMN "lastLon" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "InventoryDevice_lastNodeId_idx" ON "InventoryDevice"("lastNodeId");
