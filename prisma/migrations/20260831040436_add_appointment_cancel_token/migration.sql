/*
  Warnings:

  - The required column `cancelToken` was added to the `Appointment` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "servicePriceSnapshot" INTEGER NOT NULL DEFAULT 0,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "idempotencyKey" TEXT NOT NULL,
    "cancelToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- cancelToken has no SQL-level default (Prisma's cuid() only applies from the
-- client going forward), so existing rows are backfilled here with a random
-- hex string — unique per row, good enough since nothing has relied on it yet.
INSERT INTO "new_Appointment" ("clientEmail", "clientName", "clientPhone", "createdAt", "date", "horaFin", "horaInicio", "id", "idempotencyKey", "serviceId", "servicePriceSnapshot", "status", "cancelToken") SELECT "clientEmail", "clientName", "clientPhone", "createdAt", "date", "horaFin", "horaInicio", "id", "idempotencyKey", "serviceId", "servicePriceSnapshot", "status", lower(hex(randomblob(16))) FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");
CREATE UNIQUE INDEX "Appointment_cancelToken_key" ON "Appointment"("cancelToken");
CREATE UNIQUE INDEX "Appointment_date_horaInicio_key" ON "Appointment"("date", "horaInicio");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
