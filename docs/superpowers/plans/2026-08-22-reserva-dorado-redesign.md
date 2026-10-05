# Rediseño de reserva pública + paleta dorada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public booking screen with a 5-step wizard and unify the whole app's color palette around gold, per `docs/superpowers/specs/2026-08-22-reserva-dorado-redesign.md`.

**Architecture:** Retokenize `globals.css` (rausch/sky/mint/grape → accent/danger/success + dark-first neutral surface scale), swap fonts, then propagate the new tokens into the 12 files that reference the old palette by name. Rebuild the public booking flow as a single-step-at-a-time wizard reusing existing `Calendar`/`TimeSlotPicker`/`BookingForm`/`ConfirmationTicket` (restyled, not rewritten) plus a new `StepProgress` bar and a pure `wizardSteps` state-machine module.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (`@theme inline`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-reserva-dorado-redesign.md`

## Global Constraints

- No changes to Prisma schema, Server Actions signatures, or domain logic in `booking`/`availability`/`services-catalog`.
- Every component keeps its existing public props/API — only internal color/font references change (Tasks 1–4).
- `npm test`, `npm run lint`, `npm run build` must all pass before the branch is considered done.
- Dark-first only — no `prefers-color-scheme` split anymore for the base palette (the current dark values become the only values).

---

### Task 1: Retokenize `globals.css` + fonts

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties consumed by every other task — `--accent-100/500/900`, `--danger-500/900`, `--success-500/900`, `--surface-950/900/800`, `--glass-bg/border/shadow/blur`, `--font-display`, `--font-sans`. Tailwind tokens `--color-accent-*`, `--color-danger-*`, `--color-success-*` via `@theme inline`.

- [ ] **Step 1: Replace font imports in `layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Big_Shoulders_Display, Manrope } from "next/font/google";
import "./globals.css";

const bigShoulders = Big_Shoulders_Display({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Barbería — Reserva tu hora",
  description: "Agenda tu corte online en segundos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bigShoulders.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Rewrite `globals.css` tokens**

```css
@import "tailwindcss";

:root {
  /* Gold-accented dark glassmorphism — imported from "booking design mockup" (Claude Design). Dark-first: this used to be the
     prefers-color-scheme:dark branch, now promoted to the only palette. */
  --background: radial-gradient(1200px 800px at 12% -12%, #16203a, #0a0f1c 62%);
  --foreground: #eef2fb;
  --foreground-strong: #cbd3e6;
  --foreground-muted: #7f89a2;

  --accent-100: #f2cd8f;
  --accent-500: #d9a34a;
  --accent-900: #b9772e;
  --danger-500: #e23e5c;
  --danger-900: #9e1e3c;
  --success-500: #1e9e72;
  --success-900: #0d6a4b;

  --surface-950: #0a0f1c;
  --surface-900: #121a2e;
  --surface-800: #1a2440;

  --glass-bg: linear-gradient(150deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035));
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 20px 44px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --glass-blur: 22px;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent-100: var(--accent-100);
  --color-accent-500: var(--accent-500);
  --color-accent-900: var(--accent-900);
  --color-danger-500: var(--danger-500);
  --color-danger-900: var(--danger-900);
  --color-success-500: var(--success-500);
  --color-success-900: var(--success-900);
  --font-display: var(--font-big-shoulders);
  --font-sans: var(--font-manrope);
}

body {
  min-height: 100vh;
  background: var(--background);
  background-attachment: fixed;
  color: var(--foreground);
  font-family: var(--font-manrope), system-ui, sans-serif;
}

/* Ambient orbs — soft radial-gradient circles that drift slowly behind the
   glass surfaces. */
@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(24px, -18px); }
}

.ambient-orb {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  filter: blur(2px);
  animation: orb-drift 28s ease-in-out infinite;
}

@layer components {
  .glass-surface {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    border-radius: 1.75rem;
  }

  .font-display {
    font-family: var(--font-big-shoulders), system-ui, sans-serif;
    letter-spacing: -0.02em;
  }
}
```

- [ ] **Step 3: Verify dev server compiles**

Run: `npm run dev` (or reuse the already-running one), open `http://localhost:3000`. Expect a dark gold-accented background with no CSS errors in the terminal. Existing components will look broken/uncolored where they still reference `--rausch-*` etc. — that's expected until Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: retokenize palette to gold + dark-first, swap fonts"
```

---

### Task 2: Retokenize UI atoms and admin/booking leaf components

**Files:**
- Modify: `src/components/ui/GlassButton.tsx`
- Modify: `src/components/ui/GlassStat.tsx`
- Modify: `src/components/charts/RevenueBarChart.tsx`
- Modify: `src/components/admin/ReservasCalendar.tsx`
- Modify: `src/app/admin/reservas/page.tsx`
- Modify: `src/app/admin/login/page.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/components/booking/ConfirmationTicket.tsx`

**Interfaces:**
- Consumes: tokens from Task 1 (`--accent-*`, `--danger-*`, `--success-*`, `--font-big-shoulders`).
- Produces: no new exports — same props/API as before for every component.

- [ ] **Step 1: `GlassButton.tsx`** — swap `rausch`→`accent`, `sky`→`accent` (selection ring), gradient text on solid, shadow rausch→accent:

```tsx
import { type ButtonHTMLAttributes } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "solid" = filled gold gradient CTA. "glass" = translucent selectable chip (default). */
  variant?: "solid" | "glass";
  selected?: boolean;
}

export function GlassButton({ className = "", variant = "glass", selected = false, ...props }: GlassButtonProps) {
  const base =
    "font-display px-5 py-3 text-sm font-bold transition-all duration-200 ease-out active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-2xl";

  const solid =
    "text-[#1a1206] shadow-[0_10px_24px_rgba(185,119,46,0.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(185,119,46,0.45)]";
  const solidBg = { backgroundImage: "linear-gradient(150deg, var(--accent-100), var(--accent-900))" };

  const glass = `glass-surface !rounded-2xl hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)] ${
    selected ? "ring-2 ring-[var(--accent-500)]" : ""
  }`;

  if (variant === "solid") {
    return <button className={`${base} ${solid} ${className}`} style={solidBg} {...props} />;
  }
  return (
    <button className={`${base} ${glass} text-[var(--foreground)] ${className}`} {...props} />
  );
}
```

(Note: solid text switches to a dark ink color — gold gradients are light, white text would be low-contrast.)

- [ ] **Step 2: `GlassStat.tsx`** — accent union type `"accent" | "danger" | "success"`, default `"accent"`:

```tsx
export function GlassStat({
  label,
  value,
  accent = "accent",
}: {
  label: string;
  value: string;
  accent?: "accent" | "danger" | "success";
}) {
  return (
    <div className="glass-surface relative overflow-hidden p-6">
      <div
        className="ambient-orb -right-10 -top-10 h-32 w-32"
        style={{
          background: `radial-gradient(circle, var(--${accent}-100, var(--${accent}-500)) 0%, transparent 70%)`,
          opacity: 0.35,
        }}
      />
      <p className="font-display relative text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="font-display relative mt-2 text-4xl font-extrabold text-[var(--foreground)] md:text-5xl">
        {value}
      </p>
    </div>
  );
}
```

(`danger`/`success` have no `-100` step, so the `var(--x-100, var(--x-500))` fallback keeps the orb visible instead of resolving to nothing.)

- [ ] **Step 3: `RevenueBarChart.tsx`** — last-bar gradient uses accent instead of rausch, other bars use a muted gold instead of sky, text fill/font family updated:

```tsx
import { formatCLP } from "@/lib/money";
import type { MonthlyRevenue } from "@/modules/revenue/types";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function monthLabel(month: string): string {
  const m = Number(month.split("-")[1]);
  return MONTH_LABELS[m - 1];
}

/** 3D glassmorphism bar chart — gradient body (3 stops), specular highlight
 * on the top face, drop shadow, value pill above each bar, last period
 * highlighted in gold. */
export function RevenueBarChart({ data }: { data: MonthlyRevenue[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--foreground-muted)]">Aún no hay ingresos registrados.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const barWidth = 56;
  const gap = 30;
  const chartHeight = 170;
  const topMargin = 36;
  const bottomMargin = 34;
  const width = data.length * (barWidth + gap) + gap;
  const height = topMargin + chartHeight + bottomMargin;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="mx-auto block" role="img" aria-label="Ingresos mensuales">
        <defs>
          <linearGradient id="revBarMuted" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#8a93ad" />
            <stop offset="55%" stopColor="#556080" />
            <stop offset="100%" stopColor="#333d58" />
          </linearGradient>
          <linearGradient id="revBarAccent" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#f2cd8f" />
            <stop offset="55%" stopColor="#d9a34a" />
            <stop offset="100%" stopColor="#b9772e" />
          </linearGradient>
          <linearGradient id="revBarSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="revBarShadow" x="-60%" y="-20%" width="220%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0b1220" floodOpacity="0.35" />
          </filter>
        </defs>

        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const barHeight = Math.max((d.total / max) * chartHeight, 6);
          const x = gap + i * (barWidth + gap);
          const y = topMargin + (chartHeight - barHeight);
          const gradId = isLast ? "revBarAccent" : "revBarMuted";

          return (
            <g key={d.month} filter="url(#revBarShadow)">
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={14} fill={`url(#${gradId})`} />
              <rect x={x} y={y} width={barWidth} height={Math.min(barHeight, barHeight * 0.55)} rx={14} fill="url(#revBarSheen)" />
              <text
                x={x + barWidth / 2}
                y={y - 12}
                textAnchor="middle"
                fontFamily="var(--font-big-shoulders), sans-serif"
                fontWeight={800}
                fontSize="12.5"
                style={{ fill: isLast ? "var(--accent-900)" : "var(--foreground-strong)" }}
              >
                {formatCLP(d.total)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontFamily="var(--font-manrope), sans-serif"
                fontWeight={isLast ? 800 : 700}
                fontSize="13"
                style={{ fill: isLast ? "var(--accent-900)" : "var(--foreground-muted)" }}
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: `ReservasCalendar.tsx`** — replace `ring-[var(--sky-500)]` → `ring-[var(--accent-500)]`, `ring-[var(--rausch-500)]` → keep a distinct "today" marker using `--success-500` (so today and selected stay visually distinct instead of both reading as gold), dot indicator gradient rausch→accent, headings `text-[var(--sky-900)]` → `text-[var(--accent-900)]`.

Apply this find/replace across the file (same structure, only class/style values change):
- `ring-2 ring-[var(--sky-500)]` → `ring-2 ring-[var(--accent-500)]`
- `ring-1 ring-[var(--rausch-500)]` → `ring-1 ring-[var(--success-500)]`
- `backgroundImage: "linear-gradient(150deg, var(--rausch-100), var(--rausch-900))"` → `backgroundImage: "linear-gradient(150deg, var(--accent-100), var(--accent-900))"`
- `text-[var(--sky-900)]` → `text-[var(--accent-900)]` (both headings)

- [ ] **Step 5: `admin/reservas/page.tsx`** — `accent="rausch"` → `accent="accent"`, `text-[var(--sky-900)]` → `text-[var(--accent-900)]`.

- [ ] **Step 6: `admin/login/page.tsx`** — `text-[var(--rausch-900)]` → `text-[var(--danger-900)]` (this is an error message, belongs on `danger` not `accent`).

- [ ] **Step 7: `admin/layout.tsx`** — `hover:text-[var(--sky-900)]` → `hover:text-[var(--accent-900)]`, `text-[var(--rausch-900)]` (logout link) → `text-[var(--danger-900)]`.

- [ ] **Step 8: `ConfirmationTicket.tsx`** — checkmark badge gradient stays `--success-100`/`--success-900`... but `--success-100` doesn't exist (Task 1 only defines `--success-500/900`). Use `--success-500`/`--success-900`:

```tsx
style={{ backgroundImage: "linear-gradient(150deg, var(--success-500), var(--success-900))" }}
```

- [ ] **Step 9: Verify no old references remain**

Run: `grep -rn "rausch\|sky-\|mint-\|grape-\|plus-jakarta\|dm-sans" src` — expect no matches.

- [ ] **Step 10: Commit**

```bash
git add src/components/ui/GlassButton.tsx src/components/ui/GlassStat.tsx src/components/charts/RevenueBarChart.tsx src/components/admin/ReservasCalendar.tsx src/app/admin/reservas/page.tsx src/app/admin/login/page.tsx src/app/admin/layout.tsx src/components/booking/ConfirmationTicket.tsx
git commit -m "feat: retokenize admin panel and booking leaf components to gold palette"
```

---

### Task 3: `wizardSteps` pure state machine + test

**Files:**
- Create: `src/components/booking/domain/wizardSteps.ts`
- Test: `src/components/booking/domain/wizardSteps.test.ts`

**Interfaces:**
- Produces: `type StepId = "service" | "day" | "time" | "confirm" | "success"`, `STEP_ORDER: StepId[]`, `STEP_LABELS: Record<StepId, string>`, `type WizardSelections = { serviceId: string | null; date: string | null; slot: string | null }`, `canAdvance(step: StepId, sel: WizardSelections): boolean`, `nextStep(step: StepId): StepId | null`, `prevStep(step: StepId): StepId | null`.
- Consumes: nothing (pure domain module, no imports beyond types).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { STEP_ORDER, canAdvance, nextStep, prevStep } from "./wizardSteps";

describe("wizardSteps", () => {
  it("has the 5 steps in order", () => {
    expect(STEP_ORDER).toEqual(["service", "day", "time", "confirm", "success"]);
  });

  it("cannot advance from service without a serviceId", () => {
    expect(canAdvance("service", { serviceId: null, date: null, slot: null })).toBe(false);
    expect(canAdvance("service", { serviceId: "s1", date: null, slot: null })).toBe(true);
  });

  it("cannot advance from day without a date", () => {
    expect(canAdvance("day", { serviceId: "s1", date: null, slot: null })).toBe(false);
    expect(canAdvance("day", { serviceId: "s1", date: "2026-08-25", slot: null })).toBe(true);
  });

  it("cannot advance from time without a slot", () => {
    expect(canAdvance("time", { serviceId: "s1", date: "2026-08-25", slot: null })).toBe(false);
    expect(canAdvance("time", { serviceId: "s1", date: "2026-08-25", slot: "10:00" })).toBe(true);
  });

  it("confirm and success always allow advancing (form validity handled by the form itself)", () => {
    expect(canAdvance("confirm", { serviceId: "s1", date: "2026-08-25", slot: "10:00" })).toBe(true);
    expect(canAdvance("success", { serviceId: "s1", date: "2026-08-25", slot: "10:00" })).toBe(true);
  });

  it("nextStep/prevStep walk the order and return null at the ends", () => {
    expect(nextStep("service")).toBe("day");
    expect(nextStep("success")).toBeNull();
    expect(prevStep("day")).toBe("service");
    expect(prevStep("service")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/booking/domain/wizardSteps.test.ts`
Expected: FAIL — module `./wizardSteps` not found.

- [ ] **Step 3: Write the implementation**

```ts
export type StepId = "service" | "day" | "time" | "confirm" | "success";

export const STEP_ORDER: StepId[] = ["service", "day", "time", "confirm", "success"];

export const STEP_LABELS: Record<StepId, string> = {
  service: "Servicio",
  day: "Día",
  time: "Hora",
  confirm: "Datos",
  success: "Listo",
};

export interface WizardSelections {
  serviceId: string | null;
  date: string | null;
  slot: string | null;
}

/** Whether the wizard may move past `step` given the current selections.
 * "confirm" and "success" have no gate here — form-field validity is
 * handled by the confirm form itself via native `required` inputs. */
export function canAdvance(step: StepId, sel: WizardSelections): boolean {
  switch (step) {
    case "service":
      return sel.serviceId !== null;
    case "day":
      return sel.date !== null;
    case "time":
      return sel.slot !== null;
    case "confirm":
    case "success":
      return true;
  }
}

export function nextStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return i >= 0 && i < STEP_ORDER.length - 1 ? STEP_ORDER[i + 1] : null;
}

export function prevStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return i > 0 ? STEP_ORDER[i - 1] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/booking/domain/wizardSteps.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/domain/wizardSteps.ts src/components/booking/domain/wizardSteps.test.ts
git commit -m "feat: add pure wizardSteps state machine for booking wizard"
```

---

### Task 4: `StepProgress` component

**Files:**
- Create: `src/components/booking/StepProgress.tsx`

**Interfaces:**
- Consumes: `StepId`, `STEP_ORDER`, `STEP_LABELS` from `./domain/wizardSteps`.
- Produces: `StepProgress({ current: StepId })` — no other exports.

- [ ] **Step 1: Implement**

```tsx
import { STEP_ORDER, STEP_LABELS, type StepId } from "./domain/wizardSteps";

/** Animated step-progress bar — 5 segments, filled up to (and including)
 * the current step, matching the imported design's wizard header. */
export function StepProgress({ current }: { current: StepId }) {
  const currentIndex = STEP_ORDER.indexOf(current);
  const visibleSteps = STEP_ORDER.filter((s) => s !== "success");

  return (
    <div className="mb-6">
      <div className="flex gap-1.5">
        {visibleSteps.map((step, i) => (
          <div key={step} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: i <= currentIndex ? "100%" : "0%",
                backgroundImage: "linear-gradient(90deg, var(--accent-100), var(--accent-500))",
              }}
            />
          </div>
        ))}
      </div>
      {current !== "success" && (
        <p className="font-display mt-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-500)]">
          Paso {currentIndex + 1} de {visibleSteps.length} · {STEP_LABELS[current]}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/booking/StepProgress.tsx
git commit -m "feat: add StepProgress wizard header component"
```

---

### Task 5: `BookingWizard` — replaces `BookingWidget`, removes `Hero`

**Files:**
- Create: `src/components/booking/BookingWizard.tsx`
- Delete: `src/components/booking/BookingWidget.tsx`
- Delete: `src/components/hero/Hero.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `StepProgress` (Task 4), `STEP_ORDER`/`canAdvance`/`nextStep`/`prevStep`/`WizardSelections` (Task 3), existing `Calendar`, `TimeSlotPicker`, `BookingForm`, `ConfirmationTicket`, `GlassCard`, `GlassButton`, `getFreeDaysAction`/`getFreeSlotsAction` from `@/modules/availability/actions`, `createAppointmentAction` from `@/modules/booking/actions`, `ServiceItem` from `@/modules/services-catalog/types`.
- Produces: `BookingWizard({ services: ServiceItem[] })` — same entry-point contract `page.tsx` already uses for `BookingWidget`.

- [ ] **Step 1: Implement `BookingWizard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StepProgress } from "./StepProgress";
import { Calendar } from "./Calendar";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { BookingForm, type BookingFormValues } from "./BookingForm";
import { ConfirmationTicket } from "./ConfirmationTicket";
import { getFreeDaysAction, getFreeSlotsAction } from "@/modules/availability/actions";
import { createAppointmentAction } from "@/modules/booking/actions";
import { canAdvance, nextStep, prevStep, type StepId, type WizardSelections } from "./domain/wizardSteps";
import type { ServiceItem } from "@/modules/services-catalog/types";

const BOOKING_WINDOW_DAYS = 28;

export function BookingWizard({ services }: { services: ServiceItem[] }) {
  const [step, setStep] = useState<StepId>("service");
  const [serviceId, setServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [freeDays, setFreeDays] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; horaInicio: string; clientName: string } | null>(null);
  const [idempotencyKey] = useState(() => uuidv4());

  const selections: WizardSelections = { serviceId, date, slot };

  async function goNext() {
    if (!canAdvance(step, selections)) return;

    if (step === "service" && serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        const days = await getFreeDaysAction(BOOKING_WINDOW_DAYS, service.durationMinutes);
        setFreeDays(days);
      }
    }
    if (step === "day" && date && serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        const freeSlots = await getFreeSlotsAction(date, service.durationMinutes);
        setSlots(freeSlots);
      }
    }

    const next = nextStep(step);
    if (next) setStep(next);
  }

  function goBack() {
    const prev = prevStep(step);
    if (prev) setStep(prev);
  }

  async function handleSubmit(values: BookingFormValues) {
    if (!date || !slot || !serviceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createAppointmentAction({
        date,
        horaInicio: slot,
        serviceId,
        idempotencyKey,
        ...values,
      });
      setConfirmed({ date: result.date, horaInicio: result.horaInicio, clientName: result.clientName });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la reserva");
    } finally {
      setSubmitting(false);
    }
  }

  if (services.length === 0) {
    return (
      <GlassCard className="mt-8 text-center">
        <p className="text-[var(--foreground-strong)]">Aún no hay servicios configurados. Vuelve pronto.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mt-8 flex flex-col gap-6">
      <StepProgress current={step} />

      {step === "service" && (
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-[var(--foreground)] md:text-5xl">
            Barber Studio
          </h1>
          <p className="mb-2 text-[var(--foreground-strong)]">
            Reserva tu hora en segundos, sin llamadas ni esperas.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {services.map((s) => (
              <GlassButton
                key={s.id}
                type="button"
                selected={serviceId === s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setDate(null);
                  setSlot(null);
                }}
              >
                {s.name} · {s.durationMinutes}min
              </GlassButton>
            ))}
          </div>
        </div>
      )}

      {step === "day" && (
        <Calendar
          freeDays={freeDays}
          selectedDate={date}
          onSelect={(d) => {
            setDate(d);
            setSlot(null);
          }}
        />
      )}

      {step === "time" && <TimeSlotPicker slots={slots} selectedSlot={slot} onSelect={setSlot} />}

      {step === "confirm" && (
        <>
          <BookingForm submitting={submitting} onSubmit={handleSubmit} />
          {error && <p className="text-sm font-semibold text-[var(--danger-900)]">{error}</p>}
        </>
      )}

      {step === "success" && confirmed && <ConfirmationTicket {...confirmed} />}

      {step !== "success" && (
        <div className="flex justify-between">
          <GlassButton type="button" onClick={goBack} disabled={prevStep(step) === null}>
            Atrás
          </GlassButton>
          {step !== "confirm" && (
            <GlassButton type="button" variant="solid" onClick={goNext} disabled={!canAdvance(step, selections)}>
              Siguiente
            </GlassButton>
          )}
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Update `page.tsx`**

```tsx
import { BookingWizard } from "@/components/booking/BookingWizard";
import { listActiveServicesAction } from "@/modules/services-catalog/actions";

// Must always reflect the barber's current service list and availability —
// Next.js would otherwise statically prerender this page at build time and
// bake in whatever data existed then, going stale after every admin change.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await listActiveServicesAction();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <BookingWizard services={services} />
    </main>
  );
}
```

- [ ] **Step 3: Delete old files**

```bash
git rm src/components/booking/BookingWidget.tsx src/components/hero/Hero.tsx
```

(`git rm` on files not yet staged as new — if the directory `src/components/hero` becomes empty, it's removed automatically by git since it doesn't track empty directories.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds, no TypeScript errors, no unused-import lint errors (check that no other file still imports `Hero` or `BookingWidget`: `grep -rn "BookingWidget\|hero/Hero" src`).

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/BookingWizard.tsx src/app/page.tsx
git commit -m "feat: replace BookingWidget with single-step BookingWizard, remove Hero"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all green, including the new `wizardSteps.test.ts`.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual browser verification**

Start `npm run dev`, then in the browser:
1. Public flow at `/`: pick a service → pick a day → pick a time → fill the form → submit → see the success step with the checkmark, all against real availability/services data.
2. Admin: `/admin/login` → `/admin/disponibilidad`, `/admin/reservas`, `/admin/servicios` — confirm the gold palette reads clearly (no low-contrast text, no leftover pink/blue chips) and existing functionality (calendar nav, day/hour blocking, cancel appointment) still works.

- [ ] **Step 5: Commit if any fixes were needed during manual verification**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

(Skip this step if no fixes were needed.)

---

### Task 7: Finish the branch

- [ ] Use **superpowers:finishing-a-development-branch** — run the test suite, present the merge/PR/keep-as-is menu, and follow the user's established preference (merge to `master` locally) once they choose.
