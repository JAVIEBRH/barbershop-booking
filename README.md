# Barbershop Booking

An online appointment system for a barbershop: clients book a slot in a few steps, and the barber manages services, availability and reservations from an admin panel.

> **Note:** this is a sanitized public version of an app that is running in production for a real barbershop and has handled real bookings. Branding, domain and contact details have been replaced; the architecture and business logic are real.

## What it does

**For clients**
- 5-step booking wizard: choose a service → pick a day → pick a time → confirm → done.
- Confirmation email with a personal self-cancellation link (no account needed).
- Cancellation page opened from that link, identified by a unique per-appointment token.

**For the barber (admin panel)**
- Password-protected login (bcrypt hash + HMAC-signed session cookie).
- **Availability:** define bookable time ranges per day on a calendar.
- **Services:** create, edit, enable/disable services with duration and price.
- **Reservations:** week agenda and calendar view of confirmed appointments, plus a revenue chart.
- Email notification on every new booking.

## Engineering decisions worth a look

- **No double bookings, enforced by the database.** `Appointment` has a unique constraint on `(date, horaInicio)` and an `idempotencyKey`, so two concurrent requests for the same slot cannot both succeed and a retried request does not create a duplicate. An integration test runs two concurrent inserts against real SQLite.
- **Price snapshot.** Each appointment stores the service price at booking time, so editing a price later never rewrites past revenue.
- **Timezone-safe.** Dates and times are handled in an explicit business timezone (`BUSINESS_TIMEZONE`), independent of the server's clock.
- **Fail-loud configuration.** Environment variables are validated with Zod at startup. In production, a relative SQLite path is rejected on boot, because Next.js standalone `chdir()`s and would silently open a different, empty database.
- **Domain logic separated from UI.** Booking steps, formatting and availability rules live in plain, unit-tested modules (`domain/`), not inside components.
- **Single-file backups.** SQLite keeps the whole app state in one file, so a backup is a file copy.

## Tech stack

**App:** Next.js 16 (App Router, standalone output) · React 19 · TypeScript · Tailwind CSS 4
**Data:** Prisma 7 · SQLite (better-sqlite3 adapter) · versioned migrations
**Validation & auth:** Zod · bcryptjs · HMAC-signed sessions
**Email:** Resend (client confirmation + barber notification)
**Quality:** Vitest (domain, service and integration tests) · ESLint · strict TypeScript
**Deploy:** VPS with PM2 behind a reverse proxy — see [`docs/DEPLOY.md`](docs/DEPLOY.md)

## Running locally

```bash
npm ci
cp .env.example .env     # then fill in the values
npm run build            # generates the Prisma client and applies migrations
npm run dev
```

Open http://localhost:3000. The admin panel lives at `/admin/login`.

Environment variables (see `.env.example`): `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `BUSINESS_TIMEZONE`, `BARBER_EMAIL`, `APP_BASE_URL`.

```bash
npm test         # unit + integration tests
npm run lint
```

> `better-sqlite3` is a native module. On Windows it needs the Visual Studio C++ build tools if no prebuilt binary is available for your Node version.

## Project structure

```
src/
  app/            routes: booking flow, cancellation page, admin panel
  components/     booking wizard, admin UI, shared UI
  modules/        booking, availability, notifications, auth (services + domain logic)
  lib/            env validation, time, money, calendar helpers
prisma/           schema and migrations
docs/             design specs, implementation plans, deploy guide
```
