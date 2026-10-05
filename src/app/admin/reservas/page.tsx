import { requireAdminSession } from "@/modules/auth/guard";
import { listAppointmentsInRangeAction } from "@/modules/booking/actions";
import { getRevenueSummaryAction } from "@/modules/revenue/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassStat } from "@/components/ui/GlassStat";
import { RevenueBarChart } from "@/components/charts/RevenueBarChart";
import { ReservasCalendar } from "@/components/admin/ReservasCalendar";
import { WeekAgenda } from "@/components/admin/WeekAgenda";
import { daysInMonth, toDateStr, weekDatesStartingMonday } from "@/lib/calendar";
import { todayInBusinessTimezone } from "@/lib/time";
import { formatCLP } from "@/lib/money";

export default async function ReservasPage() {
  await requireAdminSession();

  const todayStr = todayInBusinessTimezone();
  const [year, month] = todayStr.split("-").map(Number);
  const weekDates = weekDatesStartingMonday(todayStr);

  const [revenue, monthAppointments, weekAppointments] = await Promise.all([
    getRevenueSummaryAction(),
    listAppointmentsInRangeAction(toDateStr(year, month, 1), toDateStr(year, month, daysInMonth(year, month))),
    listAppointmentsInRangeAction(weekDates[0], weekDates[6]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassStat label="Ingresos totales" value={formatCLP(revenue.total)} accent="accent" />
        <GlassCard className="md:col-span-2">
          <h2 className="font-display mb-2 text-sm font-bold uppercase tracking-wide text-[var(--accent-900)]">
            Ingresos por mes
          </h2>
          <RevenueBarChart data={revenue.monthly} />
        </GlassCard>
      </div>

      <WeekAgenda weekDates={weekDates} appointments={weekAppointments} todayStr={todayStr} />

      <ReservasCalendar
        initialAppointments={monthAppointments}
        initialYear={year}
        initialMonth={month}
        todayStr={todayStr}
      />
    </div>
  );
}
