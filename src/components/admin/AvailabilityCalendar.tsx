"use client";

import { useState, useTransition } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import {
  getMonthOverviewAction,
  unblockDayAction,
  blockDayAction,
  addRangeAction,
  updateRangeAction,
  removeRangeAction,
} from "@/modules/availability/actions";
import { daysInMonth, firstWeekdayOfMonth, toDateStr } from "@/lib/calendar";
import type { AvailabilityRange, DayOverview } from "@/modules/availability/types";

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// The timeline's own semantics (open/closed) are a fixed green/red pair,
// independent of the gold accent used for selection/buttons elsewhere —
// every minute in the visible window reads as one or the other, nothing
// is ever a neutral "no data" gray.
const AXIS_START = 8 * 60; // 08:00
const AXIS_END = 22 * 60; // 22:00
const OPEN_GRADIENT = "linear-gradient(90deg, #5ecf9e, #1e9e72)";
const CLOSED_GRADIENT = "linear-gradient(90deg, #c23a54, #f0768e)";

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pct(min: number): number {
  return Math.min(100, Math.max(0, ((min - AXIS_START) / (AXIS_END - AXIS_START)) * 100));
}

interface Segment {
  type: "open" | "closed";
  s: number;
  e: number;
}

/** Every minute of the visible window, accounted for — open or closed,
 * never neutral — so the bar itself answers "what's happening this day"
 * without a legend. */
function buildSegments(ranges: AvailabilityRange[]): Segment[] {
  const clipped = ranges
    .map((r) => ({ s: Math.max(AXIS_START, toMin(r.horaInicio)), e: Math.min(AXIS_END, toMin(r.horaFin)) }))
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.s - b.s);
  const segs: Segment[] = [];
  let cursor = AXIS_START;
  for (const r of clipped) {
    if (r.s > cursor) segs.push({ type: "closed", s: cursor, e: r.s });
    segs.push({ type: "open", s: r.s, e: r.e });
    cursor = Math.max(cursor, r.e);
  }
  if (cursor < AXIS_END) segs.push({ type: "closed", s: cursor, e: AXIS_END });
  return segs;
}

function Track({ ranges, height = 6 }: { ranges: AvailabilityRange[]; height?: number }) {
  return (
    <div className="relative w-full overflow-hidden rounded" style={{ height, background: "rgba(255,255,255,.07)" }}>
      {buildSegments(ranges).map((seg, i) => (
        <i
          key={i}
          className="absolute top-0 bottom-0"
          title={`${seg.type === "open" ? "Abierto" : "Cerrado"} ${String(Math.floor(seg.s / 60)).padStart(2, "0")}:${String(seg.s % 60).padStart(2, "0")}–${String(Math.floor(seg.e / 60)).padStart(2, "0")}:${String(seg.e % 60).padStart(2, "0")}`}
          style={{
            left: pct(seg.s) + "%",
            width: Math.max(0, pct(seg.e) - pct(seg.s)) + "%",
            background: seg.type === "open" ? OPEN_GRADIENT : CLOSED_GRADIENT,
          }}
        />
      ))}
    </div>
  );
}

/** Admin availability calendar — every date starts fully blocked (no
 * ranges), and the whole model is "a date's list of open ranges", nothing
 * else. Each cell shows that list as a green/red timeline strip so the
 * grid itself explains the state; clicking a date opens a panel where a
 * single switch is the primary action (block ⇄ unblock with a sensible
 * default window) and a secondary "fine-tune" list handles splitting
 * hours (lunch break) or narrowing to just an early/late slot. */
export function AvailabilityCalendar({
  initialOverview,
  initialYear,
  initialMonth,
  todayStr,
}: {
  initialOverview: DayOverview[];
  initialYear: number;
  initialMonth: number;
  todayStr: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, DayOverview[]>>({
    [monthKey(initialYear, initialMonth)]: initialOverview,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentKey = monthKey(year, month);
  const overview = cache[currentKey] ?? [];
  const byDate = new Map(overview.map((o) => [o.date, o]));

  async function fetchMonth(y: number, m: number) {
    const from = toDateStr(y, m, 1);
    const to = toDateStr(y, m, daysInMonth(y, m));
    return getMonthOverviewAction(from, to);
  }

  async function goToMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    const key = monthKey(newYear, newMonth);
    if (!cache[key]) {
      setLoading(true);
      const rows = await fetchMonth(newYear, newMonth);
      setCache((prev) => ({ ...prev, [key]: rows }));
      setLoading(false);
    }
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  }

  async function refreshCurrentMonth() {
    const rows = await fetchMonth(year, month);
    setCache((prev) => ({ ...prev, [currentKey]: rows }));
  }

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        await refreshCurrentMonth();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el cambio");
      }
    });
  }

  const totalDays = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayOfMonth(year, month);
  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => toDateStr(year, month, i + 1)),
  ];

  const selected = selectedDate ? byDate.get(selectedDate) : null;
  const isOpen = !!selected && selected.ranges.length > 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="glass-surface flex-1 p-5">
        <div className="mb-4 flex items-center justify-between">
          <GlassButton type="button" onClick={() => goToMonth(-1)} aria-label="Mes anterior">
            ‹
          </GlassButton>
          <h3 className="font-display text-lg font-extrabold">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          <GlassButton type="button" onClick={() => goToMonth(1)} aria-label="Mes siguiente">
            ›
          </GlassButton>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-[var(--foreground-muted)] sm:gap-1.5">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;
            const day = byDate.get(date);
            const isPast = date < todayStr;
            const isToday = date === todayStr;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                disabled={isPast}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-white/[0.03] px-1 py-1.5 text-xs font-semibold transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-30 ${
                  isSelected ? "ring-2 ring-[var(--accent-500)]" : isToday ? "ring-1 ring-white/40" : ""
                }`}
              >
                <span>{Number(date.slice(-2))}</span>
                <Track ranges={day?.ranges ?? []} />
              </button>
            );
          })}
        </div>
        {loading && <p className="mt-3 text-xs text-[var(--foreground-muted)]">Cargando...</p>}

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--foreground-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded" style={{ background: OPEN_GRADIENT }} /> Abierto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded" style={{ background: CLOSED_GRADIENT }} /> Bloqueado
          </span>
        </div>
      </div>

      <div className="glass-surface w-full p-5 lg:w-96">
        <h3 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-[var(--accent-900)]">
          {selectedDate ?? "Selecciona un día"}
        </h3>

        {!selected && (
          <p className="text-sm text-[var(--foreground-muted)]">
            Toca un día del calendario para bloquearlo, desbloquearlo, o ajustar sus horarios.
          </p>
        )}

        {selected && (
          <div key={selectedDate} className="flex flex-col gap-4">
            <div>
              <Track ranges={selected.ranges} height={34} />
              <div className="mt-1 flex justify-between text-[0.65rem] tabular-nums text-[var(--foreground-muted)]">
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              style={{
                borderColor: isOpen ? "rgba(30,158,114,.4)" : "var(--glass-border)",
                background: isOpen ? "rgba(30,158,114,.12)" : "rgba(255,255,255,.04)",
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-sm font-extrabold">{isOpen ? "Desbloqueado" : "Bloqueado"}</span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {isOpen ? "Los clientes pueden reservar este día" : "Los clientes no ven este día"}
                </span>
              </div>
              {/* 64×36 — the one control a barber taps from a phone between
                  clients, so it's the most generous touch target on the page. */}
              <button
                type="button"
                role="switch"
                aria-checked={isOpen}
                aria-label="Bloquear o desbloquear este día"
                disabled={pending}
                onClick={() => run(() => (isOpen ? blockDayAction(selected.date) : unblockDayAction(selected.date)))}
                className="relative h-9 w-16 flex-none rounded-full transition-colors disabled:opacity-50"
                style={{ background: isOpen ? "#1e9e72" : "#c23a54" }}
              >
                <span
                  className="absolute top-[3px] left-[3px] h-[30px] w-[30px] rounded-full bg-white shadow-md transition-transform"
                  style={{ transform: isOpen ? "translateX(28px)" : "translateX(0)" }}
                />
              </button>
            </div>

            {isOpen && (
              <div className="flex flex-col gap-2 border-t border-[var(--glass-border)] pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
                  Horarios de este día
                </p>
                {selected.ranges.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2">
                    <GlassInput
                      type="time"
                      defaultValue={r.horaInicio}
                      disabled={pending}
                      onChange={(e) => run(() => updateRangeAction(r.id, selected.date, e.target.value, r.horaFin))}
                      className="w-28"
                      aria-label="Hora de inicio"
                    />
                    <span className="text-xs text-[var(--foreground-muted)]">a</span>
                    <GlassInput
                      type="time"
                      defaultValue={r.horaFin}
                      disabled={pending}
                      onChange={(e) => run(() => updateRangeAction(r.id, selected.date, r.horaInicio, e.target.value))}
                      className="w-28"
                      aria-label="Hora de término"
                    />
                    <GlassButton
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => removeRangeAction(r.id))}
                      className="!px-3 !py-2 text-xs"
                      aria-label="Quitar este horario"
                    >
                      ✕
                    </GlassButton>
                  </div>
                ))}
                <GlassButton
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addRangeAction(selected.date, "09:00", "19:00"))}
                  className="self-start text-xs"
                >
                  + Agregar otro horario
                </GlassButton>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Para un hueco de almuerzo o abrir solo una hora puntual, agrega un segundo
                  horario en vez de editar el existente.
                </p>
              </div>
            )}

            {error && <p className="text-sm font-semibold text-[var(--danger-900)]">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
