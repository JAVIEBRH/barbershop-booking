import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.join(__dirname, "test-concurrency.db");
const dbUrl = `file:${dbPath}`;

describe("bookingRepository.createInTransaction (real SQLite)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: dbUrl } });
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("only lets one of two concurrent inserts for the same (date, horaInicio) succeed", async () => {
    const service = await prisma.service.create({ data: { name: "Corte", durationMinutes: 30, price: 5000 } });
    const serviceId = service.id;

    const attempt = (idempotencyKey: string) =>
      prisma.$transaction(async (tx) => {
        const clashing = await tx.appointment.findFirst({
          where: { date: "2026-09-01", horaInicio: "10:00", status: "confirmed" },
        });
        if (clashing) throw Object.assign(new Error("Slot already taken"), { code: "P2002" });
        return tx.appointment.create({
          data: {
            date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", serviceId,
            clientName: "A", clientPhone: "1", clientEmail: "a@example.com", idempotencyKey,
          },
        });
      });

    const results = await Promise.allSettled([attempt("key-a"), attempt("key-b")]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const stored = await prisma.appointment.findMany({ where: { date: "2026-09-01", horaInicio: "10:00" } });
    expect(stored).toHaveLength(1);
  });
});
