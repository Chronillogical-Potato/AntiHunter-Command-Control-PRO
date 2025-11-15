-- CreateTable
CREATE TABLE "FaaAircraft" (
    "id" TEXT NOT NULL,
    "nNumber" VARCHAR(10) NOT NULL,
    "serialNumber" VARCHAR(80),
    "manufacturerModel" VARCHAR(32),
    "engineModel" VARCHAR(32),
    "yearManufactured" INTEGER,
    "registrantType" INTEGER,
    "registrantName" TEXT,
    "street1" TEXT,
    "street2" TEXT,
    "city" TEXT,
    "state" VARCHAR(4),
    "zip" VARCHAR(16),
    "region" VARCHAR(4),
    "county" TEXT,
    "country" TEXT,
    "lastActionDate" TIMESTAMP(3),
    "certIssueDate" TIMESTAMP(3),
    "certification" TEXT,
    "aircraftType" TEXT,
    "engineType" TEXT,
    "statusCode" VARCHAR(4),
    "modeSCode" VARCHAR(16),
    "modeSCodeHex" VARCHAR(16),
    "fractionalOwner" BOOLEAN,
    "airworthinessDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "uniqueId" VARCHAR(32),
    "kitManufacturer" TEXT,
    "kitModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaaAircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaaRegistrySync" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "datasetUrl" TEXT,
    "datasetVersion" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaaRegistrySync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaaAircraft_nNumber_idx" ON "FaaAircraft"("nNumber");

-- CreateIndex
CREATE INDEX "FaaAircraft_modeSCodeHex_idx" ON "FaaAircraft"("modeSCodeHex");
