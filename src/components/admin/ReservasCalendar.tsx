"use client";

import { useMemo, useState } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { listAppointmentsInRangeAction, cancelAppointmentAction } from "@/modules/booking/actions";
import { daysInMonth, firstWeekdayOfMonth, toDateStr } from "@/lib/calendar";
import { formatCLP } from "@/lib/money";
import type { AppointmentSummary } from "@/modules/booking/types";

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

export function ReservasCalendar({
  initialAppointments,
  initialYear,
  initialMonth,
  todayStr,
}: {
  initialAppointments: AppointmentSummary[];
  initialYear: number;
  initialMonth: number;
  todayStr: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Cache fetched months so navigating back to an already-visited month
  // (including the initial one) never needs a setState-in-effect reset.
  const [cache, setCache] = useState<Record<string, AppointmentSummary[]>>({
    [monthKey(initialYear, initialMonth)]: initialAppointments,
  });

  const currentKey = monthKey(year, month);

  /** Fetches and caches a month's appointments if not already cached, then
   * navigates to it. Triggered directly from the nav buttons — not a
   * useEffect reacting to year/month state — so there's no
   * setState-in-effect and no risk of stale-closure races between rapid
   * clicks (each click awaits its own fetch before switching). */
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
      const from = toDateStr(newYear, newMonth, 1);
      const to = toDateStr(newYear, newMonth, daysInMonth(newYear, newMonth));
      const rows = await listAppointmentsInRangeAction(from, to);
      setCache((prev) => ({ ...prev, [key]: rows }));
      setLoading(false);
    }

    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  }

  const byDay = useMemo(() => {
    const appointments = cache[currentKey] ?? [];
    const map = new Map<string, AppointmentSummary[]>();
    for (const a of appointments) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return map;
  }, [cache, currentKey]);

  const totalDays = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayOfMonth(year, month);
  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => toDateStr(year, month, i + 1)),
  ];

  async function handleCancel(id: string) {
    await cancelAppointmentAction(id);
    setCache((prev) => ({
      ...prev,
      [currentKey]: (prev[currentKey] ?? []).filter((a) => a.id !== id),
    }));
  }

  const selectedAppointments = selectedDate ? byDay.get(selectedDate) ?? [] : [];

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

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase text-[var(--foreground-muted)]">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;
            const dayAppointments = byDay.get(date) ?? [];
            const isToday = date === todayStr;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`glass-surface !rounded-xl flex aspect-square flex-col items-center justify-center gap-1 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                  isSelected ? "ring-2 ring-[var(--accent-500)]" : ""
                } ${isToday ? "ring-1 ring-[var(--success-500)]" : ""}`}
              >
                <span>{Number(date.slice(-2))}</span>
                {dayAppointments.length > 0 && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundImage: "linear-gradient(150deg, var(--accent-100), var(--accent-900))" }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {loading && <p className="mt-3 text-xs text-[var(--foreground-muted)]">Cargando...</p>}
      </div>

      <div className="glass-surface w-full p-5 lg:w-80">
        <h3 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-[var(--accent-900)]">
          {selectedDate ?? "Selecciona un día"}
        </h3>
        {selectedDate && selectedAppointments.length === 0 && (
          <p className="text-sm text-[var(--foreground-muted)]">Sin reservas ese día.</p>
        )}
        <div className="flex flex-col gap-3">
          {selectedAppointments.map((a) => (
            <div key={a.id} className="glass-surface !rounded-xl p-3">
              <p className="font-display font-bold">
                {a.horaInicio} — {a.serviceName}
              </p>
              <p className="text-sm text-[var(--foreground-muted)]">{a.clientName}</p>
              <p className="text-sm text-[var(--foreground-muted)]">{formatCLP(a.price)}</p>
              <GlassButton type="button" className="mt-2 w-full" onClick={() => handleCancel(a.id)}>
                Cancelar
              </GlassButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
