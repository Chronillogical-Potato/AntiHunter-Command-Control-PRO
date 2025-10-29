-- CreateTable
CREATE TABLE "AlarmSound" (
    "level" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlarmSound_pkey" PRIMARY KEY ("level")
);
