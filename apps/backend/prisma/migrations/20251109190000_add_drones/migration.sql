-- CreateTable
CREATE TABLE "Drone" (
    "id" TEXT NOT NULL,
    "mac" TEXT,
    "nodeId" TEXT,
    "siteId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Drone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Drone"
  ADD CONSTRAINT "Drone_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Drone"
  ADD CONSTRAINT "Drone_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Drone_siteId_idx" ON "Drone"("siteId");
CREATE INDEX "Drone_nodeId_idx" ON "Drone"("nodeId");
