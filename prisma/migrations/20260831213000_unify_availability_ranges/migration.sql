-- Unify AvailabilityRule + AvailabilityException + AvailabilityBlock into
-- a single AvailabilityRange table. These three only ever held admin
-- schedule configuration (weekly hours, per-date overrides, hour blocks),
-- never client/booking data, so dropping and recreating loses no real
-- business data — appointments (Appointment table) are untouched.

-- DropTable
DROP TABLE "AvailabilityRule";

-- DropTable
DROP TABLE "AvailabilityException";

-- DropTable
DROP TABLE "AvailabilityBlock";

-- CreateTable
CREATE TABLE "AvailabilityRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AvailabilityRange_date_idx" ON "AvailabilityRange"("date");
