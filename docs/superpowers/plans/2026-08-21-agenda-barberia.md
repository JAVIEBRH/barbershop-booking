# Agenda de Reservas para Barbero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public booking link for a barber — hero + calendar booking widget for clients, admin panel for the barber to set availability — deployed as a lightweight, zero-maintenance Next.js app on a VPS.

**Architecture:** Next.js 15 App Router with a layered, module-per-domain backend (`modules/booking`, `modules/availability`, `modules/services-catalog`, `modules/notifications`, `modules/auth`), each exposing only `service.ts`/`actions.ts` to the outside — no cross-module imports of `repository.ts`. Business dates/times are stored as plain `YYYY-MM-DD` / `HH:mm` strings in the barber's fixed timezone (`BUSINESS_TIMEZONE`), never as UTC timestamps, to eliminate timezone-conversion bugs entirely.

**Tech Stack:** Next.js 15 (App Router) + TypeScript strict, Prisma ORM + SQLite, Tailwind CSS, Resend (email), Vitest (tests), PM2 (VPS process manager).

**Spec:** `docs/superpowers/specs/2026-08-21-agenda-barberia-design.md`

## Deviations found during execution (read before implementing Tasks 5, 7, 12)

- **Timezone bug caught in manual verification (Task 13):** the original
  plan's `BookingWidget` computed "today" client-side via
  `new Date().toISOString().slice(0,10)` and passed `fromDate`/`toDate` to
  `getFreeDaysAction`. This mixes the visitor's local wall-clock with a
  UTC-serialized date — exactly the class of bug `BUSINESS_TIMEZONE` was
  meant to prevent, and it was never actually used. Fix: added
  `src/lib/time.ts` with `todayInBusinessTimezone()` (via
  `Intl.DateTimeFormat("en-CA", { timeZone: env.BUSINESS_TIMEZONE })`) and
  `addDaysToDateStr()`. `getFreeDaysAction` now takes a plain `daysAhead:
  number` and computes the date range itself, server-side, in
  `BUSINESS_TIMEZONE` — the client never computes "today". The same
  `new Date().toISOString()` "today" pattern was also fixed in
  `bookingRepository.listUpcomingConfirmed()`. **When implementing Task 5's
  `getFreeDaysAction` and Task 12's `BookingWidget`, use the `daysAhead`
  signature and `src/lib/time.ts` from the start — do not implement the
  client-side date math shown further below and then fix it after.**
- **Password hash `$` escaping**: see the note inside Task 8 Step 7.
- **Prisma 7 driver adapter**: see the note inside Task 2.

## Global Constraints

- Next.js 15, App Router, TypeScript strict mode (`strict: true` in `tsconfig.json`).
- Database: Prisma + SQLite (file-based, no separate DB server/process).
- Dates stored as `YYYY-MM-DD` strings, times as `HH:mm` strings — both in `BUSINESS_TIMEZONE`, never `Date`/UTC for business logic.
- `Appointment` has a DB-level unique index on `(date, horaInicio)` — the anti-double-booking barrier. All appointment creation goes through `prisma.$transaction`.
- Every `Appointment` creation carries a client-generated `idempotencyKey` (UUID); duplicate keys return the existing appointment instead of creating a new one.
- No module imports another module's `repository.ts` — only `service.ts`/`actions.ts` are public surface.
- Admin routes under `/admin` require a valid signed session cookie; unauthenticated requests redirect to `/admin/login`.
- Email sending (Resend) must never block or fail a booking — wrap in try/catch, log failure, still return success to the client.
- Env vars validated at startup with `zod` in `src/lib/env.ts`: `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `BUSINESS_TIMEZONE`.
- Build target: `output: 'standalone'` in `next.config.ts`, run via PM2 on the VPS.

---

## File Structure

```
prisma/
  schema.prisma
src/
  lib/
    env.ts                          # zod-validated env
    prisma.ts                       # singleton PrismaClient
  modules/
    booking/
      domain/
        overlap.ts                  # pure time-range overlap logic
        overlap.test.ts
      repository.ts                 # Prisma access, internal to module
      service.ts                    # createAppointment, cancelAppointment, listUpcoming
      service.test.ts
      actions.ts                    # Server Actions wrapping service.ts
      types.ts
    availability/
      domain/
        slots.ts                    # computeFreeSlots pure function
        slots.test.ts
      repository.ts
      service.ts                    # getFreeDays, getFreeSlots, setRule, addException
      actions.ts
      types.ts
    services-catalog/
      repository.ts
      service.ts                    # list/create/update Service
      actions.ts
      types.ts
    notifications/
      email.ts                      # EmailSender interface + Resend implementation
      templates.ts                  # confirmation email content
    auth/
      session.ts                    # sign/verify session cookie, password hash check
      actions.ts                    # login/logout Server Actions
      guard.ts                      # requireAdminSession() helper for admin pages
  components/
    ui/
      GlassCard.tsx
      GlassButton.tsx
      GlassInput.tsx
    hero/
      Hero.tsx
    booking/
      BookingWidget.tsx              # client island, orchestrates the flow
      Calendar.tsx
      TimeSlotPicker.tsx
      BookingForm.tsx
      ConfirmationTicket.tsx
  app/
    layout.tsx
    globals.css
    page.tsx                        # landing: Hero + BookingWidget
    admin/
      layout.tsx                    # session guard
      login/page.tsx
      disponibilidad/page.tsx
      reservas/page.tsx
      servicios/page.tsx
tests/setup.ts
ecosystem.config.cjs                # PM2 config
.env.example
```

---

### Task 1: Project scaffold

**Files:**
- Create: entire Next.js project (via CLI), `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json` (scripts, deps)

**Interfaces:**
- Produces: a running Next.js dev server and a working `npm test` command that later tasks build on.

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint --no-turbopack --yes
```

- [ ] **Step 2: Set TypeScript strict mode**

In `tsconfig.json`, confirm/set:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 3: Add remaining dependencies**

```bash
npm install prisma @prisma/client zod bcryptjs resend uuid
npm install -D vitest @vitejs/plugin-react tsx
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.mts` (`.mts`, not `.ts` — avoids a CJS/ESM config-loader
warning; `import.meta.dirname`'s `fileURLToPath` equivalent is required for
the same reason):
```ts
import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(dirname, "./src") },
  },
});
```

Create `tests/setup.ts`:
```ts
// Global test setup — intentionally empty for now, extended by later tasks.
export {};
```

- [ ] **Step 5: Add test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Set standalone build output**

In `next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 7: Verify dev server runs**

Run: `npm run dev` (then stop it, e.g. Ctrl+C, or run with a short timeout) — confirm no errors and the default page loads at `http://localhost:3000`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with TS strict, Tailwind, Vitest, standalone output"
```

---

### Task 2: Env validation + Prisma schema

**Files:**
- Create: `src/lib/env.ts`, `prisma/schema.prisma`, `src/lib/prisma.ts`, `.env.example`, `.env` (local, gitignored)
- Modify: `.gitignore` (ensure `.env`, `*.db` ignored)

**Interfaces:**
- Produces: `env` (typed object) from `src/lib/env.ts`; `prisma` singleton from `src/lib/prisma.ts`; DB models `Service`, `AvailabilityRule`, `AvailabilityException`, `Appointment` for later tasks.

- [ ] **Step 0: Install Prisma 7's SQLite driver adapter deps**

```bash
npm install dotenv @prisma/adapter-better-sqlite3 better-sqlite3
```

- [ ] **Step 1: Write env schema**

Create `src/lib/env.ts` (the `dotenv/config` import lets plain `tsx` script
runs and test runs load `.env` the same way Next.js does automatically):
```ts
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  BUSINESS_TIMEZONE: z.string().min(1),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  SESSION_SECRET: process.env.SESSION_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  BUSINESS_TIMEZONE: process.env.BUSINESS_TIMEZONE,
});
```

- [ ] **Step 2: Create `.env.example` and local `.env`**

Create `.env.example`:
```
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD_HASH=""
SESSION_SECRET=""
RESEND_API_KEY=""
BUSINESS_TIMEZONE="America/Santiago"
```

Copy it to `.env` and fill `DATABASE_URL="file:./dev.db"` and `BUSINESS_TIMEZONE="America/Santiago"` (leave the rest to be filled in Task 8/9).

- [ ] **Step 3: Ensure `.gitignore` covers secrets/DB**

Confirm `.gitignore` contains:
```
.env
*.db
src/generated
```

> **Deviation from original plan (discovered during execution):** the
> installed Prisma version is 7.x, which removed `datasource.url` from
> `schema.prisma` and now requires a `prisma.config.ts` plus a driver
> adapter (`@prisma/adapter-better-sqlite3` + `better-sqlite3`) passed to
> `PrismaClient`. The generated client also now lives at
> `src/generated/prisma` (gitignored) instead of `node_modules`, imported
> as `@/generated/prisma/client`. Steps below reflect the actual Prisma 7
> setup used.

- [ ] **Step 4: Write Prisma schema**

Create `prisma.config.ts` at the project root:
```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Service {
  id        String   @id @default(cuid())
  name      String
  durationMinutes Int
  price     Int
  active    Boolean  @default(true)
  appointments Appointment[]
  createdAt DateTime @default(now())
}

model AvailabilityRule {
  id         String   @id @default(cuid())
  weekday    Int      // 0=Sunday .. 6=Saturday
  openTime   String   // "HH:mm"
  closeTime  String   // "HH:mm"
  createdAt  DateTime @default(now())
}

model AvailabilityException {
  id        String   @id @default(cuid())
  date      String   // "YYYY-MM-DD"
  isOpen    Boolean  // false = blocked day, true = extra open day
  openTime  String?  // required if isOpen = true
  closeTime String?  // required if isOpen = true
  createdAt DateTime @default(now())

  @@unique([date])
}

model Appointment {
  id              String   @id @default(cuid())
  date            String   // "YYYY-MM-DD"
  horaInicio      String   // "HH:mm"
  horaFin         String   // "HH:mm"
  serviceId       String
  service         Service  @relation(fields: [serviceId], references: [id])
  clientName      String
  clientPhone     String
  clientEmail     String
  status          String   @default("confirmed") // "confirmed" | "cancelled"
  idempotencyKey  String   @unique
  createdAt       DateTime @default(now())

  @@unique([date, horaInicio])
}
```

- [ ] **Step 5: Create Prisma client singleton (with the SQLite driver adapter)**

Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Run initial migration and generate the client**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: migration succeeds, `prisma/migrations/` created, `dev.db` created locally, `src/generated/prisma` created. `env.ts` must import `"dotenv/config"` at its top (Step 1) so both Next.js and plain `tsx` script runs load `.env` the same way.

- [ ] **Step 7: Verify Prisma client generates and imports cleanly**

Create a throwaway `tests/_verify-prisma.ts`:
```ts
import { prisma } from "@/lib/prisma";
console.log(typeof prisma.service.findMany);
```

Run: `npx tsx tests/_verify-prisma.ts`
Expected: prints `function`. Delete the throwaway file afterward.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add env validation, Prisma schema (Service, AvailabilityRule, AvailabilityException, Appointment), initial migration"
```

---

### Task 3: Booking domain — overlap logic

**Files:**
- Create: `src/modules/booking/domain/overlap.ts`, `src/modules/booking/domain/overlap.test.ts`

**Interfaces:**
- Produces: `TimeRange` type, `rangesOverlap(a, b): boolean` — consumed by Task 4 (`slots.ts`) and Task 7 (`booking/service.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/modules/booking/domain/overlap.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rangesOverlap } from "./overlap";

describe("rangesOverlap", () => {
  it("returns true when ranges overlap partially", () => {
    expect(
      rangesOverlap(
        { horaInicio: "10:00", horaFin: "10:30" },
        { horaInicio: "10:15", horaFin: "10:45" }
      )
    ).toBe(true);
  });

  it("returns false when ranges are back-to-back (touching, not overlapping)", () => {
    expect(
      rangesOverlap(
        { horaInicio: "10:00", horaFin: "10:30" },
        { horaInicio: "10:30", horaFin: "11:00" }
      )
    ).toBe(false);
  });

  it("returns false when ranges are disjoint", () => {
    expect(
      rangesOverlap(
        { horaInicio: "09:00", horaFin: "09:30" },
        { horaInicio: "10:00", horaFin: "10:30" }
      )
    ).toBe(false);
  });

  it("returns true when one range fully contains the other", () => {
    expect(
      rangesOverlap(
        { horaInicio: "09:00", horaFin: "12:00" },
        { horaInicio: "10:00", horaFin: "10:30" }
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/booking/domain/overlap.test.ts`
Expected: FAIL — `overlap.ts` does not exist / `rangesOverlap` not defined.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/booking/domain/overlap.ts`:
```ts
export interface TimeRange {
  horaInicio: string; // "HH:mm"
  horaFin: string;    // "HH:mm"
}

/** Two ranges overlap if one starts before the other ends, both ways. Touching edges (10:30-11:00 vs 10:00-10:30) do NOT count as overlap. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/booking/domain/overlap.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(booking): add pure time-range overlap logic with tests"
```

---

### Task 4: Availability domain — free slot computation

**Files:**
- Create: `src/modules/availability/domain/slots.ts`, `src/modules/availability/domain/slots.test.ts`

**Interfaces:**
- Consumes: `TimeRange`, `rangesOverlap` from `src/modules/booking/domain/overlap.ts`.
- Produces: `DayAvailability` type, `computeFreeSlots(day, serviceDurationMinutes, busyRanges): string[]` — consumed by Task 5 (`availability/service.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/modules/availability/domain/slots.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeFreeSlots } from "./slots";

describe("computeFreeSlots", () => {
  it("returns evenly stepped slots across the open window when nothing is busy", () => {
    const slots = computeFreeSlots(
      { openTime: "10:00", closeTime: "11:00" },
      30,
      []
    );
    expect(slots).toEqual(["10:00", "10:15", "10:30"]);
  });

  it("excludes slots that would overlap a busy range", () => {
    // Busy 10:30-11:00 leaves only a 30-minute gap at the very start (10:00-10:30).
    // Every other candidate start (10:15, 10:30, ...) overlaps the busy block.
    const slots = computeFreeSlots(
      { openTime: "10:00", closeTime: "11:00" },
      30,
      [{ horaInicio: "10:30", horaFin: "11:00" }]
    );
    expect(slots).toEqual(["10:00"]);
  });

  it("returns no slots when the service duration doesn't fit in the window", () => {
    const slots = computeFreeSlots(
      { openTime: "10:00", closeTime: "10:20" },
      30,
      []
    );
    expect(slots).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/availability/domain/slots.test.ts`
Expected: FAIL — `slots.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/availability/domain/slots.ts`:
```ts
import { rangesOverlap, type TimeRange } from "@/modules/booking/domain/overlap";

export interface DayAvailability {
  openTime: string;  // "HH:mm"
  closeTime: string; // "HH:mm"
}

const SLOT_STEP_MINUTES = 15;

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Candidate start times every SLOT_STEP_MINUTES that (a) leave room for the full service duration before closeTime and (b) don't overlap any existing busy range. */
export function computeFreeSlots(
  day: DayAvailability,
  serviceDurationMinutes: number,
  busyRanges: TimeRange[]
): string[] {
  const slots: string[] = [];
  let cursor = day.openTime;

  while (true) {
    const candidateEnd = addMinutes(cursor, serviceDurationMinutes);
    if (candidateEnd > day.closeTime) break;

    const candidate: TimeRange = { horaInicio: cursor, horaFin: candidateEnd };
    const isBusy = busyRanges.some((busy) => rangesOverlap(candidate, busy));
    if (!isBusy) slots.push(cursor);

    cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
  }

  return slots;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/availability/domain/slots.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(availability): add pure free-slot computation logic with tests"
```

---

### Task 5: Availability module — repository, service, actions

**Files:**
- Create: `src/modules/availability/types.ts`, `src/modules/availability/repository.ts`, `src/modules/availability/service.ts`, `src/modules/availability/actions.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts`; `computeFreeSlots`, `DayAvailability` from `src/modules/availability/domain/slots.ts`; `TimeRange` from `src/modules/booking/domain/overlap.ts`.
- Produces (for Task 7 booking service and UI tasks 11/12/13):
  - `getFreeDaysInRange(fromDate: string, toDate: string): Promise<string[]>`
  - `getFreeSlotsForDate(date: string, serviceDurationMinutes: number): Promise<string[]>`
  - `setWeeklyRule(weekday: number, openTime: string, closeTime: string): Promise<void>`
  - `listWeeklyRules(): Promise<{ id: string; weekday: number; openTime: string; closeTime: string }[]>`
  - `setDateException(date: string, isOpen: boolean, openTime?: string, closeTime?: string): Promise<void>`

- [ ] **Step 1: Define types**

Create `src/modules/availability/types.ts`:
```ts
export interface WeeklyRule {
  id: string;
  weekday: number; // 0-6, 0 = Sunday
  openTime: string;
  closeTime: string;
}
```

- [ ] **Step 2: Write the repository (Prisma access only)**

Create `src/modules/availability/repository.ts`:
```ts
import { prisma } from "@/lib/prisma";

export const availabilityRepository = {
  findRuleForWeekday(weekday: number) {
    return prisma.availabilityRule.findFirst({ where: { weekday } });
  },
  // `weekday` has no unique constraint in the schema, so this is a manual
  // find-then-write instead of a Prisma `upsert` (which needs a unique key).
  async upsertRule(weekday: number, openTime: string, closeTime: string) {
    const existing = await prisma.availabilityRule.findFirst({ where: { weekday } });
    if (existing) {
      return prisma.availabilityRule.update({
        where: { id: existing.id },
        data: { openTime, closeTime },
      });
    }
    return prisma.availabilityRule.create({ data: { weekday, openTime, closeTime } });
  },
  listRules() {
    return prisma.availabilityRule.findMany({ orderBy: { weekday: "asc" } });
  },
  findExceptionForDate(date: string) {
    return prisma.availabilityException.findUnique({ where: { date } });
  },
  upsertException(date: string, isOpen: boolean, openTime: string | null, closeTime: string | null) {
    return prisma.availabilityException.upsert({
      where: { date },
      update: { isOpen, openTime, closeTime },
      create: { date, isOpen, openTime, closeTime },
    });
  },
  findConfirmedAppointmentsForDate(date: string) {
    return prisma.appointment.findMany({
      where: { date, status: "confirmed" },
      select: { horaInicio: true, horaFin: true },
    });
  },
};
```

- [ ] **Step 3: Write the service (business logic, no Prisma types leaking out)**

Create `src/modules/availability/service.ts`:
```ts
import { availabilityRepository } from "./repository";
import { computeFreeSlots, type DayAvailability } from "./domain/slots";
import type { TimeRange } from "@/modules/booking/domain/overlap";
import type { WeeklyRule } from "./types";

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

async function resolveDayAvailability(date: string): Promise<DayAvailability | null> {
  const exception = await availabilityRepository.findExceptionForDate(date);
  if (exception) {
    if (!exception.isOpen) return null;
    return { openTime: exception.openTime!, closeTime: exception.closeTime! };
  }
  const rule = await availabilityRepository.findRuleForWeekday(weekdayOf(date));
  if (!rule) return null;
  return { openTime: rule.openTime, closeTime: rule.closeTime };
}

export const availabilityService = {
  async getFreeSlotsForDate(date: string, serviceDurationMinutes: number): Promise<string[]> {
    const day = await resolveDayAvailability(date);
    if (!day) return [];
    const busy: TimeRange[] = (await availabilityRepository.findConfirmedAppointmentsForDate(date)).map(
      (a) => ({ horaInicio: a.horaInicio, horaFin: a.horaFin })
    );
    return computeFreeSlots(day, serviceDurationMinutes, busy);
  },

  async getFreeDaysInRange(fromDate: string, toDate: string, serviceDurationMinutes: number): Promise<string[]> {
    const days: string[] = [];
    let cursor = new Date(`${fromDate}T00:00:00Z`);
    const end = new Date(`${toDate}T00:00:00Z`);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const slots = await this.getFreeSlotsForDate(dateStr, serviceDurationMinutes);
      if (slots.length > 0) days.push(dateStr);
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  },

  async listWeeklyRules(): Promise<WeeklyRule[]> {
    return availabilityRepository.listRules();
  },

  async setWeeklyRule(weekday: number, openTime: string, closeTime: string): Promise<void> {
    await availabilityRepository.upsertRule(weekday, openTime, closeTime);
  },

  async setDateException(date: string, isOpen: boolean, openTime?: string, closeTime?: string): Promise<void> {
    await availabilityRepository.upsertException(date, isOpen, openTime ?? null, closeTime ?? null);
  },
};
```

- [ ] **Step 4: Write Server Actions wrapping the service**

Create `src/modules/availability/actions.ts`:
```ts
"use server";

import { availabilityService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";

export async function getFreeDaysAction(fromDate: string, toDate: string, serviceDurationMinutes: number) {
  return availabilityService.getFreeDaysInRange(fromDate, toDate, serviceDurationMinutes);
}

export async function getFreeSlotsAction(date: string, serviceDurationMinutes: number) {
  return availabilityService.getFreeSlotsForDate(date, serviceDurationMinutes);
}

export async function setWeeklyRuleAction(weekday: number, openTime: string, closeTime: string) {
  await requireAdminSession();
  await availabilityService.setWeeklyRule(weekday, openTime, closeTime);
}

export async function setDateExceptionAction(date: string, isOpen: boolean, openTime?: string, closeTime?: string) {
  await requireAdminSession();
  await availabilityService.setDateException(date, isOpen, openTime, closeTime);
}

export async function listWeeklyRulesAction() {
  await requireAdminSession();
  return availabilityService.listWeeklyRules();
}
```

Note: `requireAdminSession` doesn't exist yet — it's built in Task 8. This file will not compile until then; that's expected and resolved by the end of Task 8. Leave it as-is.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(availability): add repository, service, and Server Actions (depends on auth guard landing in Task 8)"
```

---

### Task 6: Services-catalog module

**Files:**
- Create: `src/modules/services-catalog/types.ts`, `src/modules/services-catalog/repository.ts`, `src/modules/services-catalog/service.ts`, `src/modules/services-catalog/service.test.ts`, `src/modules/services-catalog/actions.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts`.
- Produces: `Service` type `{ id, name, durationMinutes, price, active }`; `servicesCatalogService.listActive()`, `.create(input)`, `.update(id, input)` — consumed by Task 7 (booking needs `durationMinutes`) and Task 13 (admin UI).

- [ ] **Step 1: Define types**

Create `src/modules/services-catalog/types.ts`:
```ts
export interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface CreateServiceInput {
  name: string;
  durationMinutes: number;
  price: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/modules/services-catalog/service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { servicesCatalogService } from "./service";
import { servicesCatalogRepository } from "./repository";

vi.mock("./repository", () => ({
  servicesCatalogRepository: {
    findManyActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe("servicesCatalogService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects creating a service with non-positive duration", async () => {
    await expect(
      servicesCatalogService.create({ name: "Corte", durationMinutes: 0, price: 5000 })
    ).rejects.toThrow(/duración/i);
    expect(servicesCatalogRepository.create).not.toHaveBeenCalled();
  });

  it("creates a service with valid input", async () => {
    vi.mocked(servicesCatalogRepository.create).mockResolvedValue({
      id: "1", name: "Corte", durationMinutes: 30, price: 5000, active: true,
    } as never);

    const result = await servicesCatalogService.create({ name: "Corte", durationMinutes: 30, price: 5000 });

    expect(result.id).toBe("1");
    expect(servicesCatalogRepository.create).toHaveBeenCalledWith({ name: "Corte", durationMinutes: 30, price: 5000 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/modules/services-catalog/service.test.ts`
Expected: FAIL — `service.ts`/`repository.ts` do not exist.

- [ ] **Step 4: Write the repository**

Create `src/modules/services-catalog/repository.ts`:
```ts
import { prisma } from "@/lib/prisma";
import type { CreateServiceInput } from "./types";

export const servicesCatalogRepository = {
  findManyActive() {
    return prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  },
  create(input: CreateServiceInput) {
    return prisma.service.create({ data: input });
  },
  update(id: string, input: Partial<CreateServiceInput> & { active?: boolean }) {
    return prisma.service.update({ where: { id }, data: input });
  },
};
```

- [ ] **Step 5: Write the service**

Create `src/modules/services-catalog/service.ts`:
```ts
import { servicesCatalogRepository } from "./repository";
import type { CreateServiceInput, ServiceItem } from "./types";

export const servicesCatalogService = {
  async listActive(): Promise<ServiceItem[]> {
    return servicesCatalogRepository.findManyActive();
  },

  async create(input: CreateServiceInput): Promise<ServiceItem> {
    if (input.durationMinutes <= 0) {
      throw new Error("La duración del servicio debe ser mayor a 0 minutos");
    }
    if (input.price < 0) {
      throw new Error("El precio no puede ser negativo");
    }
    return servicesCatalogRepository.create(input);
  },

  async update(id: string, input: Partial<CreateServiceInput> & { active?: boolean }): Promise<ServiceItem> {
    return servicesCatalogRepository.update(id, input);
  },
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/modules/services-catalog/service.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Write Server Actions**

Create `src/modules/services-catalog/actions.ts`:
```ts
"use server";

import { servicesCatalogService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";
import type { CreateServiceInput } from "./types";

export async function listActiveServicesAction() {
  return servicesCatalogService.listActive();
}

export async function createServiceAction(input: CreateServiceInput) {
  await requireAdminSession();
  return servicesCatalogService.create(input);
}

export async function updateServiceAction(id: string, input: Partial<CreateServiceInput> & { active?: boolean }) {
  await requireAdminSession();
  return servicesCatalogService.update(id, input);
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(services-catalog): add repository, service with validation, tests, and Server Actions"
```

---

### Task 7: Booking module — repository, service (with anti-double-booking transaction), actions

**Files:**
- Create: `src/modules/booking/types.ts`, `src/modules/booking/repository.ts`, `src/modules/booking/service.ts`, `src/modules/booking/service.test.ts`, `src/modules/booking/actions.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts`; `rangesOverlap` from `src/modules/booking/domain/overlap.ts`; `availabilityService.getFreeSlotsForDate` from Task 5; `servicesCatalogService` from Task 6; `sendBookingConfirmation` from Task 9 (`src/modules/notifications/email.ts`).
- Produces: `createAppointment(input): Promise<AppointmentResult>`, `cancelAppointment(id): Promise<void>`, `listUpcoming(): Promise<AppointmentSummary[]>` — consumed by Task 12 (booking widget) and Task 13 (admin reservas page).

- [ ] **Step 1: Define types**

Create `src/modules/booking/types.ts`:
```ts
export interface CreateAppointmentInput {
  date: string;         // "YYYY-MM-DD"
  horaInicio: string;   // "HH:mm"
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  idempotencyKey: string;
}

export interface AppointmentResult {
  id: string;
  date: string;
  horaInicio: string;
  horaFin: string;
  clientName: string;
}

export interface AppointmentSummary extends AppointmentResult {
  clientPhone: string;
  clientEmail: string;
  status: string;
  serviceName: string;
}
```

- [ ] **Step 2: Write the failing test (including the concurrency/double-booking case)**

Create `src/modules/booking/service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { bookingService } from "./service";
import { bookingRepository } from "./repository";
import { availabilityService } from "@/modules/availability/service";
import { sendBookingConfirmation } from "@/modules/notifications/email";

vi.mock("./repository", () => ({
  bookingRepository: {
    findByIdempotencyKey: vi.fn(),
    createInTransaction: vi.fn(),
    getServiceDuration: vi.fn(),
  },
}));
vi.mock("@/modules/availability/service", () => ({
  availabilityService: { getFreeSlotsForDate: vi.fn() },
}));
vi.mock("@/modules/notifications/email", () => ({
  sendBookingConfirmation: vi.fn(),
}));

const baseInput = {
  date: "2026-09-01",
  horaInicio: "10:00",
  serviceId: "svc1",
  clientName: "Juan Pérez",
  clientPhone: "+56911111111",
  clientEmail: "juan@example.com",
  idempotencyKey: "key-1",
};

describe("bookingService.createAppointment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the existing appointment when idempotencyKey was already used, without creating a new one", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue({
      id: "existing-1", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("existing-1");
    expect(bookingRepository.createInTransaction).not.toHaveBeenCalled();
  });

  it("rejects when the requested slot is not currently free", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceDuration).mockResolvedValue(30);
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["09:00", "09:30"]); // 10:00 not free

    await expect(bookingService.createAppointment(baseInput)).rejects.toThrow(/no está disponible/i);
    expect(bookingRepository.createInTransaction).not.toHaveBeenCalled();
  });

  it("creates the appointment and sends a confirmation email when the slot is free", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceDuration).mockResolvedValue(30);
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockResolvedValue({
      id: "new-1", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("new-1");
    expect(sendBookingConfirmation).toHaveBeenCalledOnce();
  });

  it("still returns success when the confirmation email fails to send", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceDuration).mockResolvedValue(30);
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockResolvedValue({
      id: "new-2", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);
    vi.mocked(sendBookingConfirmation).mockRejectedValue(new Error("Resend down"));

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("new-2");
  });

  it("surfaces the DB unique-constraint violation as the same 'slot not available' error (race condition caught at the DB layer)", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceDuration).mockResolvedValue(30);
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    await expect(bookingService.createAppointment(baseInput)).rejects.toThrow(/no está disponible/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/modules/booking/service.test.ts`
Expected: FAIL — `service.ts`/`repository.ts` do not exist.

- [ ] **Step 4: Write the repository (transaction + unique constraint)**

Create `src/modules/booking/repository.ts`:
```ts
import { prisma } from "@/lib/prisma";
import type { CreateAppointmentInput } from "./types";

interface CreateArgs extends CreateAppointmentInput {
  horaFin: string;
}

export const bookingRepository = {
  findByIdempotencyKey(idempotencyKey: string) {
    return prisma.appointment.findUnique({ where: { idempotencyKey } });
  },

  async getServiceDuration(serviceId: string): Promise<number> {
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    return service.durationMinutes;
  },

  /** Re-checks for an overlapping confirmed appointment and inserts inside one transaction, so the check-then-insert is atomic from this process's point of view. The DB unique index on (date, horaInicio) is the final barrier against a truly concurrent second process. */
  async createInTransaction(input: CreateArgs) {
    return prisma.$transaction(async (tx) => {
      const clashing = await tx.appointment.findFirst({
        where: { date: input.date, horaInicio: input.horaInicio, status: "confirmed" },
      });
      if (clashing) {
        throw Object.assign(new Error("Slot already taken"), { code: "P2002" });
      }
      return tx.appointment.create({
        data: {
          date: input.date,
          horaInicio: input.horaInicio,
          horaFin: input.horaFin,
          serviceId: input.serviceId,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail,
          idempotencyKey: input.idempotencyKey,
        },
      });
    });
  },

  listUpcomingConfirmed() {
    const today = new Date().toISOString().slice(0, 10);
    return prisma.appointment.findMany({
      where: { date: { gte: today }, status: "confirmed" },
      include: { service: true },
      orderBy: [{ date: "asc" }, { horaInicio: "asc" }],
    });
  },

  cancel(id: string) {
    return prisma.appointment.update({ where: { id }, data: { status: "cancelled" } });
  },
};
```

- [ ] **Step 5: Write the service**

Create `src/modules/booking/service.ts`:
```ts
import { bookingRepository } from "./repository";
import { availabilityService } from "@/modules/availability/service";
import { sendBookingConfirmation } from "@/modules/notifications/email";
import type { AppointmentResult, AppointmentSummary, CreateAppointmentInput } from "./types";

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export const bookingService = {
  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentResult> {
    const existing = await bookingRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const durationMinutes = await bookingRepository.getServiceDuration(input.serviceId);
    const freeSlots = await availabilityService.getFreeSlotsForDate(input.date, durationMinutes);
    if (!freeSlots.includes(input.horaInicio)) {
      throw new Error("Ese horario ya no está disponible, por favor elige otro.");
    }

    const horaFin = addMinutes(input.horaInicio, durationMinutes);

    let created;
    try {
      created = await bookingRepository.createInTransaction({ ...input, horaFin });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        throw new Error("Ese horario ya no está disponible, por favor elige otro.");
      }
      throw err;
    }

    try {
      await sendBookingConfirmation({
        to: input.clientEmail,
        clientName: input.clientName,
        date: input.date,
        horaInicio: input.horaInicio,
      });
    } catch {
      // Email is best-effort — the booking itself already succeeded.
    }

    return created;
  },

  async cancelAppointment(id: string): Promise<void> {
    await bookingRepository.cancel(id);
  },

  async listUpcoming(): Promise<AppointmentSummary[]> {
    const rows = await bookingRepository.listUpcomingConfirmed();
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      clientEmail: r.clientEmail,
      status: r.status,
      serviceName: r.service.name,
    }));
  },
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/modules/booking/service.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6b: Write a real-DB concurrency test for the anti-double-booking barrier**

The tests above mock the repository, so they prove the *service* handles a
`P2002` error correctly — they don't prove the DB constraint itself stops a
true race. Add one integration test against a real (temporary) SQLite file
that fires two concurrent `createInTransaction` calls at the same slot.

Create `src/modules/booking/repository.integration.test.ts`:
```ts
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
  let serviceId: string;

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
    serviceId = service.id;

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
```

Run: `npx vitest run src/modules/booking/repository.integration.test.ts`
Expected: PASS — proves the DB-level barrier actually stops a real concurrent double booking, not just the mocked service logic.

- [ ] **Step 7: Write Server Actions**

Create `src/modules/booking/actions.ts`:
```ts
"use server";

import { bookingService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";
import type { CreateAppointmentInput } from "./types";

export async function createAppointmentAction(input: CreateAppointmentInput) {
  return bookingService.createAppointment(input);
}

export async function cancelAppointmentAction(id: string) {
  await requireAdminSession();
  await bookingService.cancelAppointment(id);
}

export async function listUpcomingAppointmentsAction() {
  await requireAdminSession();
  return bookingService.listUpcoming();
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(booking): add repository with transactional double-booking guard, service, tests, Server Actions"
```

---

### Task 8: Auth module — admin session

**Files:**
- Create: `src/modules/auth/session.ts`, `src/modules/auth/session.test.ts`, `src/modules/auth/guard.ts`, `src/modules/auth/actions.ts`

**Interfaces:**
- Consumes: `env` from `src/lib/env.ts`.
- Produces: `verifyPassword(plain): Promise<boolean>`, `createSessionCookie(): Promise<void>`, `clearSessionCookie(): Promise<void>`, `requireAdminSession(): Promise<void>` (throws/redirects if unauthenticated) — consumed by Tasks 5, 6, 7 actions (already referencing `requireAdminSession`) and Task 13 admin pages.

- [ ] **Step 1: Write the failing test for the pure signing logic**

Create `src/modules/auth/session.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { signSessionValue, verifySessionValue } from "./session";

describe("session token signing", () => {
  it("verifies a token it just signed", () => {
    const token = signSessionValue("admin", "test-secret-0123456789012345678901");
    expect(verifySessionValue(token, "test-secret-0123456789012345678901")).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSessionValue("admin", "secret-a-0123456789012345678901234");
    expect(verifySessionValue(token, "secret-b-0123456789012345678901234")).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = signSessionValue("admin", "test-secret-0123456789012345678901");
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifySessionValue(tampered, "test-secret-0123456789012345678901")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/auth/session.test.ts`
Expected: FAIL — `session.ts` does not exist.

- [ ] **Step 3: Write the session module**

Create `src/modules/auth/session.ts`:
```ts
import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** value = "<payload>.<hmac>" — a minimal signed token, no external JWT lib needed for a single static claim. */
export function signSessionValue(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionValue(token: string, secret: string): boolean {
  const [payload, hmac] = token.split(".");
  if (!payload || !hmac) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function verifyPassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, env.ADMIN_PASSWORD_HASH);
}

export async function createSessionCookie(): Promise<void> {
  const token = signSessionValue("admin", env.SESSION_SECRET);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionValue(token, env.SESSION_SECRET);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/auth/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the guard used by every admin action/page**

Create `src/modules/auth/guard.ts`:
```ts
import { redirect } from "next/navigation";
import { hasValidSession } from "./session";

/** Call at the top of any admin Server Action or Server Component. Redirects unauthenticated requests to the login page. */
export async function requireAdminSession(): Promise<void> {
  const ok = await hasValidSession();
  if (!ok) {
    redirect("/admin/login");
  }
}
```

- [ ] **Step 6: Write login/logout Server Actions**

Create `src/modules/auth/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { verifyPassword, createSessionCookie, clearSessionCookie } from "./session";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const valid = await verifyPassword(password);
  if (!valid) {
    return { error: "Contraseña incorrecta" };
  }
  await createSessionCookie();
  redirect("/admin/reservas");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}
```

- [ ] **Step 7: Generate a real admin password hash for local `.env`**

Run: `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "elige-una-clave-temporal"`

> **Critical gotcha (discovered during execution):** Next.js's env loader
> (`@next/env`) performs `$VAR`-style variable expansion on `.env` files —
> and bcrypt hashes look like `$2b$10$...`, which Next.js interprets as
> variable references and silently mangles (stripping `$2b`, `$10`, etc.,
> corrupting the hash into garbage with no error). This breaks login
> completely, in dev and in production, without any visible failure at
> startup. **Escape every `$` in the hash as `\$` before writing it to
> `.env`**, e.g. turn `$2b$10$abc...` into `\$2b\$10\$abc...`. Verify it
> survives correctly before moving on:
> ```bash
> node -e "const {loadEnvConfig}=require('@next/env'); loadEnvConfig(process.cwd()); console.log(require('bcryptjs').compareSync('elige-una-clave-temporal', process.env.ADMIN_PASSWORD_HASH))"
> ```
> Expected: prints `true`. If it prints `false`, the hash was mangled — check the escaping.

Copy the escaped hash into `.env` as `ADMIN_PASSWORD_HASH`. Also set `SESSION_SECRET` in `.env` to a random 32+ char string, e.g. via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (hex strings have no `$`, so no escaping needed there).

- [ ] **Step 8: Verify Tasks 5, 6, 7 now compile**

Run: `npx tsc --noEmit`
Expected: no errors referencing `requireAdminSession` (it now exists); fix any unrelated type errors surfaced.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(auth): add signed session cookie, password verification, login/logout actions, admin guard"
```

---

### Task 9: Notifications module — Resend email

**Files:**
- Create: `src/modules/notifications/templates.ts`, `src/modules/notifications/email.ts`

**Interfaces:**
- Consumes: `env` from `src/lib/env.ts`.
- Produces: `sendBookingConfirmation(input): Promise<void>` — already consumed by Task 7's `booking/service.ts`.

- [ ] **Step 1: Write the email template**

Create `src/modules/notifications/templates.ts`:
```ts
export interface BookingConfirmationData {
  clientName: string;
  date: string;       // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
}

export function bookingConfirmationSubject(): string {
  return "Tu reserva fue confirmada";
}

export function bookingConfirmationHtml(data: BookingConfirmationData): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>¡Reserva confirmada, ${data.clientName}!</h2>
      <p>Te esperamos el <strong>${data.date}</strong> a las <strong>${data.horaInicio}</strong>.</p>
      <p>Si necesitas cancelar, responde este correo.</p>
    </div>
  `;
}
```

- [ ] **Step 2: Write the email sender**

Create `src/modules/notifications/email.ts`:
```ts
import { Resend } from "resend";
import { env } from "@/lib/env";
import { bookingConfirmationHtml, bookingConfirmationSubject } from "./templates";

const resend = new Resend(env.RESEND_API_KEY);

export interface SendBookingConfirmationInput {
  to: string;
  clientName: string;
  date: string;
  horaInicio: string;
}

export async function sendBookingConfirmation(input: SendBookingConfirmationInput): Promise<void> {
  const { error } = await resend.emails.send({
    from: "Reservas <onboarding@resend.dev>", // Resend's shared sender — works without a verified domain; swap to a custom domain address once one is verified in the Resend dashboard
    to: input.to,
    subject: bookingConfirmationSubject(),
    html: bookingConfirmationHtml({ clientName: input.clientName, date: input.date, horaInicio: input.horaInicio }),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
```

- [ ] **Step 3: Verify Task 7's mocked tests still pass with the real module present**

Run: `npx vitest run src/modules/booking/service.test.ts`
Expected: PASS (still mocked, unaffected by the real implementation existing).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(notifications): add Resend email sender and confirmation template"
```

---

### Task 10: Design system import — glassmorphism 3D theme + base UI components

**Files:**
- Create: `src/components/ui/GlassCard.tsx`, `src/components/ui/GlassButton.tsx`, `src/components/ui/GlassInput.tsx`
- Modify: `tailwind.config.ts`, `src/app/globals.css`

**Interfaces:**
- Produces: `<GlassCard>`, `<GlassButton>`, `<GlassInput>` React components and Tailwind design tokens — consumed by Tasks 11, 12, 13.

- [ ] **Step 1: Import the design system via the claude-design MCP**

Use the `claude-design` MCP tools to read `design-system mockup` and `support.js` from the referenced project (`https://claude.ai/design/p/5bf709fa-785d-4f13-a420-c9b748eefa70`). Extract: color palette, blur/shadow/border values used for the glassmorphism cards, corner radii, and any gradient/3D-tilt treatment. Translate these into Tailwind tokens rather than copying inline styles.

- [ ] **Step 2: Add design tokens to Tailwind config**

In `tailwind.config.ts`, extend `theme.extend` with the palette and effects pulled from the imported design (exact hex/blur values come from Step 1 — this is the structural shape to fill in):
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // values from the imported design system's palette
        },
      },
      backdropBlur: {
        glass: "20px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
        "glass-lg": "0 16px 48px 0 rgba(31, 38, 135, 0.35)",
      },
      borderRadius: {
        glass: "1.5rem",
      },
    },
  },
};

export default config;
```

- [ ] **Step 3: Add base glass CSS utilities**

In `src/app/globals.css`, add:
```css
@layer components {
  .glass-surface {
    @apply backdrop-blur-glass bg-white/10 border border-white/20 shadow-glass rounded-glass;
  }
}
```

- [ ] **Step 4: Build `GlassCard`**

Create `src/components/ui/GlassCard.tsx`:
```tsx
import { type ReactNode } from "react";

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`glass-surface p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-glass-lg ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Build `GlassButton`**

Create `src/components/ui/GlassButton.tsx`:
```tsx
import { type ButtonHTMLAttributes } from "react";

export function GlassButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`glass-surface px-6 py-3 font-semibold text-white transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 6: Build `GlassInput`**

Create `src/components/ui/GlassInput.tsx`:
```tsx
import { type InputHTMLAttributes } from "react";

export function GlassInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`glass-surface w-full px-4 py-3 text-white placeholder-white/60 outline-none focus:shadow-glass-lg ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 7: Verify visually**

Temporarily render `<GlassCard><GlassButton>Test</GlassButton></GlassCard>` in `src/app/page.tsx`, run `npm run dev`, confirm the glass effect renders (blur, translucency, shadow) in the browser, then remove the temporary markup (Task 11 replaces `page.tsx` properly).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(design): import glassmorphism 3D tokens from Claude Design and build base Glass UI components"
```

---

### Task 11: Hero + landing page composition

**Files:**
- Create: `src/components/hero/Hero.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: `GlassCard` from Task 10.
- Produces: `<Hero name={string} tagline={string} />` — composed into `src/app/page.tsx` alongside `BookingWidget` from Task 12.

- [ ] **Step 1: Build the Hero component**

Create `src/components/hero/Hero.tsx`:
```tsx
export function Hero({ name, tagline }: { name: string; tagline: string }) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-5xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)] md:text-7xl">
        {name}
      </h1>
      <p className="max-w-xl text-lg text-white/80 md:text-xl">{tagline}</p>
    </section>
  );
}
```

- [ ] **Step 2: Set a full-bleed gradient background for the 3D glass effect to sit on**

In `src/app/globals.css`, add:
```css
body {
  min-height: 100vh;
  background: radial-gradient(circle at 20% 20%, #6d28d9, transparent 50%),
              radial-gradient(circle at 80% 0%, #db2777, transparent 50%),
              radial-gradient(circle at 50% 100%, #0891b2, transparent 50%),
              #0f0a1f;
  background-attachment: fixed;
}
```

- [ ] **Step 3: Compose the landing page**

Replace `src/app/page.tsx`:
```tsx
import { Hero } from "@/components/hero/Hero";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { listActiveServicesAction } from "@/modules/services-catalog/actions";

// Must always reflect the barber's current service list and availability —
// Next.js would otherwise statically prerender this page at build time and
// bake in whatever data existed then, going stale after every admin change.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await listActiveServicesAction();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20">
      <Hero name="Barbería [Nombre]" tagline="Reserva tu hora en segundos" />
      <BookingWidget services={services} />
    </main>
  );
}
```

Note: `BookingWidget` doesn't exist until Task 12 — this file won't compile until then; expected.

- [ ] **Step 4: Set page metadata**

In `src/app/layout.tsx`, update the `metadata` export:
```ts
export const metadata = {
  title: "Barbería [Nombre] — Reserva tu hora",
  description: "Agenda tu corte online en segundos.",
};
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(landing): add Hero component and compose landing page (depends on BookingWidget landing in Task 12)"
```

---

### Task 12: Booking widget (client island)

**Files:**
- Create: `src/components/booking/BookingWidget.tsx`, `src/components/booking/Calendar.tsx`, `src/components/booking/TimeSlotPicker.tsx`, `src/components/booking/BookingForm.tsx`, `src/components/booking/ConfirmationTicket.tsx`

**Interfaces:**
- Consumes: `getFreeDaysAction`, `getFreeSlotsAction` (Task 5); `createAppointmentAction` (Task 7); `ServiceItem` type (Task 6); `GlassCard`, `GlassButton`, `GlassInput` (Task 10).
- Produces: `<BookingWidget services={ServiceItem[]} />` — consumed by Task 11's `page.tsx`.

- [ ] **Step 1: Build the Calendar (day picker)**

Create `src/components/booking/Calendar.tsx`:
```tsx
"use client";

import { GlassButton } from "@/components/ui/GlassButton";

export function Calendar({
  freeDays,
  selectedDate,
  onSelect,
}: {
  freeDays: string[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  if (freeDays.length === 0) {
    return <p className="text-white/70">No hay días disponibles próximamente.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {freeDays.map((date) => (
        <GlassButton
          key={date}
          onClick={() => onSelect(date)}
          className={selectedDate === date ? "ring-2 ring-white" : ""}
        >
          {date}
        </GlassButton>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build the TimeSlotPicker**

Create `src/components/booking/TimeSlotPicker.tsx`:
```tsx
"use client";

import { GlassButton } from "@/components/ui/GlassButton";

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelect,
}: {
  slots: string[];
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}) {
  if (slots.length === 0) {
    return <p className="text-white/70">No hay horas libres ese día.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => (
        <GlassButton
          key={slot}
          onClick={() => onSelect(slot)}
          className={selectedSlot === slot ? "ring-2 ring-white" : ""}
        >
          {slot}
        </GlassButton>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Build the BookingForm**

Create `src/components/booking/BookingForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";

export interface BookingFormValues {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}

export function BookingForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (values: BookingFormValues) => void;
}) {
  const [values, setValues] = useState<BookingFormValues>({ clientName: "", clientPhone: "", clientEmail: "" });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <GlassInput
        placeholder="Nombre completo"
        required
        value={values.clientName}
        onChange={(e) => setValues({ ...values, clientName: e.target.value })}
      />
      <GlassInput
        placeholder="Teléfono"
        required
        value={values.clientPhone}
        onChange={(e) => setValues({ ...values, clientPhone: e.target.value })}
      />
      <GlassInput
        type="email"
        placeholder="Email"
        required
        value={values.clientEmail}
        onChange={(e) => setValues({ ...values, clientEmail: e.target.value })}
      />
      <GlassButton type="submit" disabled={submitting}>
        {submitting ? "Reservando..." : "Confirmar reserva"}
      </GlassButton>
    </form>
  );
}
```

- [ ] **Step 4: Build the ConfirmationTicket**

Create `src/components/booking/ConfirmationTicket.tsx`:
```tsx
import { GlassCard } from "@/components/ui/GlassCard";

export function ConfirmationTicket({ date, horaInicio, clientName }: { date: string; horaInicio: string; clientName: string }) {
  return (
    <GlassCard className="text-center">
      <h3 className="text-2xl font-bold text-white">¡Reserva confirmada!</h3>
      <p className="mt-2 text-white/80">
        {clientName}, te esperamos el <strong>{date}</strong> a las <strong>{horaInicio}</strong>.
      </p>
      <p className="mt-2 text-sm text-white/60">Te enviamos un email con estos datos.</p>
    </GlassCard>
  );
}
```

- [ ] **Step 5: Build the orchestrating BookingWidget**

Create `src/components/booking/BookingWidget.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Calendar } from "./Calendar";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { BookingForm, type BookingFormValues } from "./BookingForm";
import { ConfirmationTicket } from "./ConfirmationTicket";
import { getFreeDaysAction, getFreeSlotsAction } from "@/modules/availability/actions";
import { createAppointmentAction } from "@/modules/booking/actions";
import type { ServiceItem } from "@/modules/services-catalog/types";

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BookingWidget({ services }: { services: ServiceItem[] }) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id ?? "");
  const [freeDays, setFreeDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; horaInicio: string; clientName: string } | null>(null);
  const [idempotencyKey] = useState(() => uuidv4());

  useEffect(() => {
    if (!selectedServiceId) return;
    const service = services.find((s) => s.id === selectedServiceId)!;
    getFreeDaysAction(todayPlusDays(0), todayPlusDays(28), service.durationMinutes).then(setFreeDays);
  }, [selectedServiceId, services]);

  useEffect(() => {
    if (!selectedDate || !selectedServiceId) return;
    const service = services.find((s) => s.id === selectedServiceId)!;
    getFreeSlotsAction(selectedDate, service.durationMinutes).then(setSlots);
  }, [selectedDate, selectedServiceId, services]);

  async function handleSubmit(values: BookingFormValues) {
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createAppointmentAction({
        date: selectedDate,
        horaInicio: selectedSlot,
        serviceId: selectedServiceId,
        idempotencyKey,
        ...values,
      });
      setConfirmed({ date: result.date, horaInicio: result.horaInicio, clientName: result.clientName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la reserva");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return <ConfirmationTicket {...confirmed} />;
  }

  return (
    <GlassCard className="mt-8 flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-white">Servicio</h2>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <GlassButton
              key={s.id}
              onClick={() => {
                setSelectedServiceId(s.id);
                setSelectedDate(null);
                setSelectedSlot(null);
              }}
              className={selectedServiceId === s.id ? "ring-2 ring-white" : ""}
            >
              {s.name} · {s.durationMinutes}min
            </GlassButton>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-white">Día</h2>
        <Calendar freeDays={freeDays} selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }} />
      </div>

      {selectedDate && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Hora</h2>
          <TimeSlotPicker slots={slots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
        </div>
      )}

      {selectedSlot && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Tus datos</h2>
          <BookingForm submitting={submitting} onSubmit={handleSubmit} />
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 6: Verify the full landing page compiles and runs**

Run: `npx tsc --noEmit`
Expected: no errors (Task 11's forward reference to `BookingWidget` now resolves).

Run: `npm run dev`, open `http://localhost:3000`, confirm the hero + booking widget render (service list will be empty until Task 6's seed data / Task 13's admin UI adds services — that's expected at this point).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(booking-widget): add calendar, time slot picker, form, confirmation ticket, and orchestrating client island"
```

---

### Task 13: Admin pages

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/disponibilidad/page.tsx`, `src/app/admin/reservas/page.tsx`, `src/app/admin/servicios/page.tsx`

**Interfaces:**
- Consumes: `requireAdminSession` (Task 8), `loginAction`/`logoutAction` (Task 8), `listWeeklyRulesAction`/`setWeeklyRuleAction`/`setDateExceptionAction` (Task 5), `listUpcomingAppointmentsAction`/`cancelAppointmentAction` (Task 7), `listActiveServicesAction`/`createServiceAction`/`updateServiceAction` (Task 6), `GlassCard`/`GlassButton`/`GlassInput` (Task 10).

- [ ] **Step 1: Admin layout with session guard**

This layout only renders the nav when a session exists — it does not itself
enforce auth (the login page must stay reachable while logged out). Each
protected page (Steps 3-5) calls `requireAdminSession()` individually.

Create `src/app/admin/layout.tsx`:
```tsx
import { type ReactNode } from "react";
import Link from "next/link";
import { hasValidSession } from "@/modules/auth/session";
import { logoutAction } from "@/modules/auth/actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await hasValidSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {authed && (
        <nav className="mb-6 flex items-center justify-between text-white">
          <div className="flex gap-4">
            <Link href="/admin/disponibilidad">Disponibilidad</Link>
            <Link href="/admin/reservas">Reservas</Link>
            <Link href="/admin/servicios">Servicios</Link>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="underline">Salir</button>
          </form>
        </nav>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Login page**

Create `src/app/admin/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { loginAction } from "@/modules/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <GlassCard className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-semibold text-white">Acceso barbero</h1>
      <form
        action={async (formData) => {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        }}
        className="flex flex-col gap-3"
      >
        <GlassInput type="password" name="password" placeholder="Contraseña" required />
        <GlassButton type="submit">Entrar</GlassButton>
      </form>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </GlassCard>
  );
}
```

- [ ] **Step 3: Disponibilidad page**

Create `src/app/admin/disponibilidad/page.tsx`:
```tsx
import { requireAdminSession } from "@/modules/auth/guard";
import { listWeeklyRulesAction, setWeeklyRuleAction, setDateExceptionAction } from "@/modules/availability/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function DisponibilidadPage() {
  await requireAdminSession();
  const rules = await listWeeklyRulesAction();

  return (
    <GlassCard>
      <h1 className="mb-4 text-xl font-semibold text-white">Disponibilidad semanal</h1>
      <div className="flex flex-col gap-4">
        {WEEKDAYS.map((label, weekday) => {
          const existing = rules.find((r) => r.weekday === weekday);
          return (
            <form
              key={weekday}
              action={async (formData: FormData) => {
                "use server";
                const openTime = String(formData.get("openTime"));
                const closeTime = String(formData.get("closeTime"));
                await setWeeklyRuleAction(weekday, openTime, closeTime);
              }}
              className="flex items-center gap-3 text-white"
            >
              <span className="w-24">{label}</span>
              <GlassInput type="time" name="openTime" defaultValue={existing?.openTime ?? ""} className="w-32" />
              <GlassInput type="time" name="closeTime" defaultValue={existing?.closeTime ?? ""} className="w-32" />
              <GlassButton type="submit">Guardar</GlassButton>
            </form>
          );
        })}
      </div>

      <h2 className="mb-4 mt-8 text-xl font-semibold text-white">Bloquear una fecha puntual</h2>
      <p className="mb-3 text-sm text-white/70">
        Úsalo para vacaciones o feriados: bloquea un día específico aunque su
        regla semanal lo tenga abierto.
      </p>
      <form
        action={async (formData: FormData) => {
          "use server";
          const date = String(formData.get("date"));
          await setDateExceptionAction(date, false);
        }}
        className="flex items-center gap-3"
      >
        <GlassInput type="date" name="date" required className="w-48" />
        <GlassButton type="submit">Bloquear día</GlassButton>
      </form>
    </GlassCard>
  );
}
```

- [ ] **Step 4: Reservas page**

Create `src/app/admin/reservas/page.tsx`:
```tsx
import { requireAdminSession } from "@/modules/auth/guard";
import { listUpcomingAppointmentsAction, cancelAppointmentAction } from "@/modules/booking/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

export default async function ReservasPage() {
  await requireAdminSession();
  const appointments = await listUpcomingAppointmentsAction();

  return (
    <GlassCard>
      <h1 className="mb-4 text-xl font-semibold text-white">Próximas reservas</h1>
      <div className="flex flex-col gap-3">
        {appointments.length === 0 && <p className="text-white/70">No hay reservas próximas.</p>}
        {appointments.map((a) => (
          <div key={a.id} className="flex items-center justify-between glass-surface p-3 text-white">
            <div>
              <p className="font-semibold">{a.date} {a.horaInicio} — {a.serviceName}</p>
              <p className="text-sm text-white/70">{a.clientName} · {a.clientPhone} · {a.clientEmail}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await cancelAppointmentAction(a.id);
              }}
            >
              <GlassButton type="submit">Cancelar</GlassButton>
            </form>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 5: Servicios page**

Create `src/app/admin/servicios/page.tsx`:
```tsx
import { requireAdminSession } from "@/modules/auth/guard";
import { listActiveServicesAction, createServiceAction, updateServiceAction } from "@/modules/services-catalog/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";

export default async function ServiciosPage() {
  await requireAdminSession();
  const services = await listActiveServicesAction();

  return (
    <GlassCard>
      <h1 className="mb-4 text-xl font-semibold text-white">Servicios</h1>
      <div className="mb-6 flex flex-col gap-3">
        {services.map((s) => (
          <form
            key={s.id}
            action={async (formData: FormData) => {
              "use server";
              await updateServiceAction(s.id, {
                name: String(formData.get("name")),
                durationMinutes: Number(formData.get("durationMinutes")),
                price: Number(formData.get("price")),
              });
            }}
            className="flex items-center gap-2"
          >
            <GlassInput name="name" defaultValue={s.name} className="w-40" />
            <GlassInput name="durationMinutes" type="number" defaultValue={s.durationMinutes} className="w-20" />
            <GlassInput name="price" type="number" defaultValue={s.price} className="w-24" />
            <GlassButton type="submit">Guardar</GlassButton>
            <GlassButton
              type="submit"
              formAction={async () => {
                "use server";
                await updateServiceAction(s.id, { active: false });
              }}
            >
              Desactivar
            </GlassButton>
          </form>
        ))}
      </div>
      <h2 className="mb-2 text-lg font-semibold text-white">Agregar servicio</h2>
      <form
        action={async (formData: FormData) => {
          "use server";
          await createServiceAction({
            name: String(formData.get("name")),
            durationMinutes: Number(formData.get("durationMinutes")),
            price: Number(formData.get("price")),
          });
        }}
        className="flex gap-2"
      >
        <GlassInput name="name" placeholder="Nombre" required />
        <GlassInput name="durationMinutes" type="number" placeholder="Min" required className="w-24" />
        <GlassInput name="price" type="number" placeholder="Precio" required className="w-28" />
        <GlassButton type="submit">Agregar</GlassButton>
      </form>
    </GlassCard>
  );
}
```

- [ ] **Step 6: Manual end-to-end verification**

Run: `npm run dev`. In the browser:
1. Visit `/admin/reservas` while logged out → confirm redirect to `/admin/login`.
2. Log in with the password set in Task 8 Step 7 → confirm redirect to `/admin/reservas`.
3. Go to `/admin/servicios`, add one service (e.g. "Corte clásico", 30, 8000).
4. Go to `/admin/disponibilidad`, set today's weekday open 09:00–18:00.
5. Visit `/` (landing) → confirm the service appears and today's date shows as available with free slots.
6. Complete a booking → confirm the confirmation ticket renders.
7. Go back to `/admin/reservas` → confirm the new reservation is listed, and cancel it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): add login, disponibilidad, reservas, servicios pages behind session guard"
```

---

### Task 14: VPS deploy configuration

**Files:**
- Create: `ecosystem.config.cjs`, `docs/DEPLOY.md`
- Modify: `.env.example`, `package.json` (build/start scripts)

**Interfaces:**
- Produces: a documented, repeatable deploy procedure for the user's VPS.

- [ ] **Step 1: Confirm build/start scripts**

In `package.json`, ensure:
```json
"scripts": {
  "build": "prisma generate && prisma migrate deploy && next build",
  "start": "node .next/standalone/server.js"
}
```

- [ ] **Step 2: Write the PM2 ecosystem config**

Create `ecosystem.config.cjs`:
```js
module.exports = {
  apps: [
    {
      name: "agenda-barberia",
      script: ".next/standalone/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

- [ ] **Step 3: Write the deploy doc**

Create `docs/DEPLOY.md`:
```markdown
# Deploy en VPS

> **Deviation found during execution:** `output: 'standalone'` resolves
> relative SQLite paths ambiguously between the process's cwd and the
> `.next/standalone/` bundle directory — a relative `DATABASE_URL` can
> silently point at an empty database depending on how the process is
> launched. Use an **absolute path** for `DATABASE_URL` in production
> (verified: a relative path returned HTTP 500 "table does not exist";
> an absolute path worked immediately).

1. Clonar el repo en el VPS e instalar Node.js 20+.
2. `npm ci`
3. Copiar `.env.example` a `.env` y completar `DATABASE_URL` (ruta absoluta, ver nota arriba),
   `ADMIN_PASSWORD_HASH` (generar con
   `node -e "console.log(require('bcryptjs').hashSync('tu-clave', 10))"`
   y **escapar cada `$` como `\$`** antes de pegarlo en `.env` — Next.js
   expande `$VAR` en archivos `.env` y corrompe el hash de bcrypt en
   silencio si no se escapa; verificar con
   `node -e "const {loadEnvConfig}=require('@next/env'); loadEnvConfig(process.cwd()); console.log(require('bcryptjs').compareSync('tu-clave', process.env.ADMIN_PASSWORD_HASH))"`
   — debe imprimir `true`),
   `SESSION_SECRET` (generar con
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`),
   `RESEND_API_KEY`, `BUSINESS_TIMEZONE`.
4. `npm run build` (corre las migraciones de Prisma y genera el build standalone).
5. Copiar `public/` y `.next/static/` dentro de `.next/standalone/` (requerido
   por el modo standalone de Next.js):
   ```bash
   cp -r public .next/standalone/public
   cp -r .next/static .next/standalone/.next/static
   ```
6. `npm install -g pm2` (una sola vez en el VPS).
7. `pm2 start ecosystem.config.cjs`
8. `pm2 save && pm2 startup` (para que sobreviva a reinicios del VPS).
9. Backup de datos: el archivo SQLite completo vive en la ruta de
   `DATABASE_URL` — copiarlo periódicamente (ej. cron diario) es el backup
   completo de la app.
10. Cuando se compre el dominio: apuntarlo al VPS y poner un reverse proxy
    (nginx) hacia `localhost:3000`, con certificado TLS (Let's Encrypt/certbot).
```

- [ ] **Step 4: Run the full test suite one final time**

Run: `npx vitest run`
Expected: all tests across `overlap.test.ts`, `slots.test.ts`, `service.test.ts` (services-catalog, booking), `session.test.ts` pass.

- [ ] **Step 5: Run a production build locally to catch standalone-mode issues early**

Run: `npm run build`
Expected: builds successfully, `.next/standalone/server.js` exists.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(deploy): add PM2 ecosystem config and VPS deploy documentation"
```
