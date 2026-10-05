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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("clientEmail", "clientName", "clientPhone", "createdAt", "date", "horaFin", "horaInicio", "id", "idempotencyKey", "serviceId", "status") SELECT "clientEmail", "clientName", "clientPhone", "createdAt", "date", "horaFin", "horaInicio", "id", "idempotencyKey", "serviceId", "status" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");
CREATE UNIQUE INDEX "Appointment_date_horaInicio_key" ON "Appointment"("date", "horaInicio");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
