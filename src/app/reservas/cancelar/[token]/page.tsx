import { GlassCard } from "@/components/ui/GlassCard";
import { CancelAppointmentCard } from "@/components/booking/CancelAppointmentCard";
import { getAppointmentByCancelTokenAction } from "@/modules/booking/actions";

// Must hit the DB on every request — a stale/cached render could show an
// appointment as still active after it was already cancelled (or vice versa).
export const dynamic = "force-dynamic";

export default async function CancelarReservaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appointment = await getAppointmentByCancelTokenAction(token);

  if (!appointment) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <GlassCard className="text-center">
          <h1 className="font-display mb-2 text-xl font-extrabold">Reserva no encontrada</h1>
          <p className="text-sm text-[rgba(245,247,246,0.55)]">
            Este link de cancelación ya no es válido. Si crees que es un error, escríbenos.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <CancelAppointmentCard appointment={appointment} cancelToken={token} />
    </div>
  );
}
