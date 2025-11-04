-- Add channel column to track last observed channel for inventory devices
ALTER TABLE "InventoryDevice"
ADD COLUMN "channel" INTEGER;
