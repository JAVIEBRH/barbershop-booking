import { requireAdminSession } from "@/modules/auth/guard";
import { getMonthOverviewAction } from "@/modules/availability/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { AvailabilityCalendar } from "@/components/admin/AvailabilityCalendar";
import { daysInMonth, toDateStr } from "@/lib/calendar";
import { todayInBusinessTimezone } from "@/lib/time";

export default async function DisponibilidadPage() {
  await requireAdminSession();

  const todayStr = todayInBusinessTimezone();
  const [year, month] = todayStr.split("-").map(Number);

  const overview = await getMonthOverviewAction(
    toDateStr(year, month, 1),
    toDateStr(year, month, daysInMonth(year, month))
  );

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <h1 className="font-display mb-1 text-xl font-extrabold">Disponibilidad</h1>
        <p className="mb-4 text-sm text-[var(--foreground-muted)]">
          Todos los días parten bloqueados — los clientes no los ven hasta que tú los
          desbloqueas. Toca un día para abrirlo, cerrarlo, o dejar un horario puntual (una
          hora antes de entrar a tu otro trabajo, un hueco para almorzar, etc.).
        </p>
        <AvailabilityCalendar
          initialOverview={overview}
          initialYear={year}
          initialMonth={month}
          todayStr={todayStr}
        />
      </GlassCard>
    </div>
  );
}
