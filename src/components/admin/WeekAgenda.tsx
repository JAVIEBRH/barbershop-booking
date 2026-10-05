import type { AppointmentSummary } from "@/modules/booking/types";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Week-at-a-glance agenda — the month calendar below already lets you drill
 * into a single day, but reading "what do I have this week" out of it means
 * clicking through up to 7 days one at a time. This renders all 7 in one
 * glass card, so a Monday-morning check takes one look, not seven clicks.
 * Server-rendered (no client interactivity needed for a read-only glance),
 * same glass-surface/font-display language as the rest of the admin. */
export function WeekAgenda({
  weekDates,
  appointments,
  todayStr,
}: {
  weekDates: string[];
  appointments: AppointmentSummary[];
  todayStr: string;
}) {
  const byDay = new Map<string, AppointmentSummary[]>();
  for (const a of appointments) {
    const list = byDay.get(a.date) ?? [];
    list.push(a);
    byDay.set(a.date, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  return (
    <div className="glass-surface p-5">
      <h3 className="font-display mb-3.5 text-sm font-bold uppercase tracking-wide text-[var(--accent-900)]">
        Esta semana
      </h3>
      {/* items-start: without it, CSS Grid stretches every card in a row to
          match the tallest one — a fully-booked day would blow out the
          height of every quiet day next to it. Each card sizes to its own
          content instead, and a busy day scrolls internally (below) rather
          than growing the whole row without bound. */}
      <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {weekDates.map((date, i) => {
          const dayAppointments = byDay.get(date) ?? [];
          const isToday = date === todayStr;
          return (
            <div
              key={date}
              className={`glass-surface !rounded-xl p-3 ${isToday ? "ring-1 ring-[var(--success-500)]" : ""}`}
            >
              <p className="font-display mb-2 text-xs font-bold uppercase text-[var(--foreground-muted)]">
                {WEEKDAY_SHORT[i]} {Number(date.slice(-2))}
              </p>
              {dayAppointments.length === 0 ? (
                <p className="text-xs text-[var(--foreground-muted)]">Sin reservas</p>
              ) : (
                <div className="thin-scrollbar flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1.5">
                  {dayAppointments.map((a) => (
                    <div key={a.id} className="text-xs leading-tight">
                      <span className="font-bold text-[var(--accent-100)]">{a.horaInicio}</span>{" "}
                      <span className="text-[var(--foreground-strong)]">{a.clientName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
