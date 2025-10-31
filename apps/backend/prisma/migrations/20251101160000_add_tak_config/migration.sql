-- CreateEnum
CREATE TYPE "TakProtocol" AS ENUM ('UDP', 'TCP', 'HTTPS');

-- CreateTable
CREATE TABLE "TakConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "protocol" "TakProtocol" NOT NULL DEFAULT 'UDP',
    "host" TEXT,
    "port" INTEGER,
    "tlsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cafile" TEXT,
    "certfile" TEXT,
    "keyfile" TEXT,
    "username" TEXT,
    "password" TEXT,
    "apiKey" TEXT,
    "lastConnected" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TakConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TakConfig" ("id") VALUES (1)
ON CONFLICT DO NOTHING;
