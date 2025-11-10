-- AlterTable
ALTER TABLE "Node"
    ADD COLUMN     "temperatureC" DOUBLE PRECISION,
    ADD COLUMN     "temperatureF" DOUBLE PRECISION,
    ADD COLUMN     "temperatureUpdatedAt" TIMESTAMP(3);