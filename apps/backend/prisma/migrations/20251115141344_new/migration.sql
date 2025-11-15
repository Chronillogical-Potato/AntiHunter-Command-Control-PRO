/*
  Warnings:

  - The primary key for the `SerialConfig` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `siteId` on the `SerialConfig` table. All the data in the column will be lost.
  - You are about to drop the column `defaultRadiusM` on the `Site` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SerialConfig" DROP CONSTRAINT "SerialConfig_siteId_fkey";

-- AlterTable
ALTER TABLE "CoverageConfig" ALTER COLUMN "defaultRadiusM" SET DEFAULT 50;

-- AlterTable
ALTER TABLE "Drone" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SerialConfig" DROP CONSTRAINT "SerialConfig_pkey",
DROP COLUMN "siteId",
ADD COLUMN     "id" TEXT NOT NULL DEFAULT 'serial',
ADD CONSTRAINT "SerialConfig_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "defaultRadiusM";
