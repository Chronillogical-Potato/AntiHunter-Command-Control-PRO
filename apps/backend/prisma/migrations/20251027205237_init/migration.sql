-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'SENT', 'OK', 'ERROR');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('ACTIVE', 'TRIANGULATING', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "appName" TEXT NOT NULL DEFAULT 'Command Center',
    "timezone" TEXT,
    "env" TEXT NOT NULL DEFAULT 'DEV',
    "protocol" TEXT NOT NULL DEFAULT 'meshtastic-like',
    "ackTimeoutMs" INTEGER NOT NULL DEFAULT 3000,
    "resultTimeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "maxRetries" INTEGER NOT NULL DEFAULT 2,
    "perNodeCmdRate" INTEGER NOT NULL DEFAULT 8,
    "globalCmdRate" INTEGER NOT NULL DEFAULT 30,
    "detectMode" INTEGER NOT NULL DEFAULT 2,
    "detectChannels" TEXT NOT NULL DEFAULT '1..14',
    "detectScanSecs" INTEGER NOT NULL DEFAULT 300,
    "allowForever" BOOLEAN NOT NULL DEFAULT false,
    "baselineSecs" INTEGER NOT NULL DEFAULT 300,
    "deviceScanSecs" INTEGER NOT NULL DEFAULT 300,
    "droneSecs" INTEGER NOT NULL DEFAULT 600,
    "deauthSecs" INTEGER NOT NULL DEFAULT 300,
    "randomizeSecs" INTEGER NOT NULL DEFAULT 600,
    "defaultRadiusM" INTEGER NOT NULL DEFAULT 200,
    "logLevel" TEXT NOT NULL DEFAULT 'info',
    "structuredLogs" BOOLEAN NOT NULL DEFAULT true,
    "nodePosRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "commandRetentionDays" INTEGER NOT NULL DEFAULT 180,
    "auditRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "metricsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "metricsPath" TEXT NOT NULL DEFAULT '/metrics',
    "healthEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mapTileUrl" TEXT NOT NULL DEFAULT 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    "mapAttribution" TEXT NOT NULL DEFAULT 'OpenStreetMap contributors',
    "minZoom" INTEGER NOT NULL DEFAULT 2,
    "maxZoom" INTEGER NOT NULL DEFAULT 18,
    "allowApi" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT,
    "lastMessage" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodePosition" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TargetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDevice" (
    "mac" TEXT NOT NULL,
    "siteId" TEXT,
    "vendor" TEXT,
    "type" TEXT,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3),
    "maxRSSI" INTEGER,
    "minRSSI" INTEGER,
    "avgRSSI" DOUBLE PRECISION,
    "locallyAdministered" BOOLEAN NOT NULL DEFAULT false,
    "multicast" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryDevice_pkey" PRIMARY KEY ("mac")
);

-- CreateTable
CREATE TABLE "CommandTemplate" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "parameters" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandLog" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "userId" TEXT,
    "target" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ackKind" TEXT,
    "ackStatus" TEXT,
    "ackNode" TEXT,
    "resultText" TEXT,
    "errorText" TEXT,
    "idempotencyKey" TEXT,

    CONSTRAINT "CommandLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OuiCache" (
    "oui" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OuiCache_pkey" PRIMARY KEY ("oui")
);

-- CreateTable
CREATE TABLE "TriangulationResult" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "lines" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriangulationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlarmConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "audioPack" TEXT NOT NULL DEFAULT 'default',
    "volumeInfo" INTEGER NOT NULL DEFAULT 60,
    "volumeNotice" INTEGER NOT NULL DEFAULT 70,
    "volumeAlert" INTEGER NOT NULL DEFAULT 80,
    "volumeCritical" INTEGER NOT NULL DEFAULT 90,
    "gapInfoMs" INTEGER NOT NULL DEFAULT 1000,
    "gapNoticeMs" INTEGER NOT NULL DEFAULT 1500,
    "gapAlertMs" INTEGER NOT NULL DEFAULT 2000,
    "gapCriticalMs" INTEGER NOT NULL DEFAULT 0,
    "dndStart" TEXT,
    "dndEnd" TEXT,
    "backgroundAllowed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlarmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pulseHzAlert" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "pulseHzCritical" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "blinkMs" INTEGER NOT NULL DEFAULT 400,
    "strokeBasePx" INTEGER NOT NULL DEFAULT 2,
    "strokeCriticalPx" INTEGER NOT NULL DEFAULT 4,
    "theme" TEXT NOT NULL DEFAULT 'auto',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultRadiusM" INTEGER NOT NULL DEFAULT 200,
    "dynamicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dynamicModel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeCoverageOverride" (
    "nodeId" TEXT NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeCoverageOverride_pkey" PRIMARY KEY ("nodeId")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2E7D32',
    "region" TEXT,
    "geojson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerialConfig" (
    "siteId" TEXT NOT NULL,
    "devicePath" TEXT,
    "baud" INTEGER,
    "dataBits" INTEGER,
    "parity" TEXT,
    "stopBits" INTEGER,
    "delimiter" TEXT,
    "reconnectBaseMs" INTEGER,
    "reconnectMaxMs" INTEGER,
    "reconnectJitter" DOUBLE PRECISION,
    "reconnectMaxAttempts" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerialConfig_pkey" PRIMARY KEY ("siteId")
);

-- CreateTable
CREATE TABLE "MqttConfig" (
    "id" SERIAL NOT NULL,
    "brokerUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "tlsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "caPem" TEXT,
    "certPem" TEXT,
    "keyPem" TEXT,
    "qosEvents" INTEGER NOT NULL DEFAULT 1,
    "qosCommands" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "siteId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MqttConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'auto',
    "density" TEXT NOT NULL DEFAULT 'compact',
    "mapState" JSONB,
    "tablePrefs" JSONB,
    "terminalFilters" JSONB,
    "muteLevels" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Node_siteId_idx" ON "Node"("siteId");

-- CreateIndex
CREATE INDEX "NodePosition_nodeId_ts_idx" ON "NodePosition"("nodeId", "ts");

-- CreateIndex
CREATE INDEX "Target_siteId_status_idx" ON "Target"("siteId", "status");

-- CreateIndex
CREATE INDEX "InventoryDevice_siteId_idx" ON "InventoryDevice"("siteId");

-- CreateIndex
CREATE INDEX "InventoryDevice_lastSeen_idx" ON "InventoryDevice"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "CommandLog_idempotencyKey_key" ON "CommandLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CommandLog_siteId_idx" ON "CommandLog"("siteId");

-- CreateIndex
CREATE INDEX "CommandLog_status_idx" ON "CommandLog"("status");

-- CreateIndex
CREATE INDEX "CommandLog_createdAt_idx" ON "CommandLog"("createdAt");

-- CreateIndex
CREATE INDEX "CommandLog_target_idx" ON "CommandLog"("target");

-- CreateIndex
CREATE INDEX "AuditLog_siteId_createdAt_idx" ON "AuditLog"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "TriangulationResult_targetRef_idx" ON "TriangulationResult"("targetRef");

-- CreateIndex
CREATE INDEX "TriangulationResult_nodeId_createdAt_idx" ON "TriangulationResult"("nodeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MqttConfig_siteId_key" ON "MqttConfig"("siteId");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodePosition" ADD CONSTRAINT "NodePosition_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryDevice" ADD CONSTRAINT "InventoryDevice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandTemplate" ADD CONSTRAINT "CommandTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandLog" ADD CONSTRAINT "CommandLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandLog" ADD CONSTRAINT "CommandLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriangulationResult" ADD CONSTRAINT "TriangulationResult_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialConfig" ADD CONSTRAINT "SerialConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MqttConfig" ADD CONSTRAINT "MqttConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
