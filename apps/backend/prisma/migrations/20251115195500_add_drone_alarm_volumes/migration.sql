-- Add dedicated volume controls for drone-specific alarms
ALTER TABLE "AlarmConfig"
  ADD COLUMN "volumeDroneGeofence" INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN "volumeDroneTelemetry" INTEGER NOT NULL DEFAULT 80;
