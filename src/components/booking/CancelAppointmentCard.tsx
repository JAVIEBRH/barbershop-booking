"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { BookingSummary } from "./BookingSummary";
import { formatDateLong } from "./domain/wizardFormat";
import { formatCLP } from "@/lib/money";
import { cancelAppointmentByTokenAction } from "@/modules/booking/actions";
import type { AppointmentSummary } from "@/modules/booking/types";

/** The self-cancellation page's interactive half — confirm-then-cancel (a
 * GET-only link that auto-cancelled would risk being triggered by an email
 * client's link scanner), then a plain "already cancelled" state either way. */
export function CancelAppointmentCard({
  appointment,
  cancelToken,
}: {
  appointment: AppointmentSummary;
  cancelToken: string;
}) {
  const [status, setStatus] = useState(appointment.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      await cancelAppointmentByTokenAction(cancelToken);
      setStatus("cancelled");
    } catch {
      setError("No pudimos cancelar tu reserva. Intenta de nuevo o escríbenos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard className="mx-auto max-w-sm text-center">
      <h1 className="font-display mb-4 text-xl font-extrabold">
        {status === "cancelled" ? "Reserva cancelada" : "Cancelar tu reserva"}
      </h1>

      <BookingSummary
        rows={[
          { label: "Servicio", value: appointment.serviceName },
          { label: "Fecha", value: formatDateLong(appointment.date) },
          { label: "Hora", value: appointment.horaInicio },
          { label: "Total", value: formatCLP(appointment.price), strong: true, dividerBefore: true },
        ]}
      />

      {status === "cancelled" ? (
        <p className="text-sm text-[rgba(245,247,246,0.75)]">
          Tu hora quedó liberada. Puedes reservar otra cuando quieras.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-[rgba(245,247,246,0.55)]">
            ¿Seguro que quieres cancelar esta hora? No podrás deshacerlo.
          </p>
          <GlassButton type="button" variant="solid" className="w-full" disabled={loading} onClick={handleCancel}>
            {loading ? "Cancelando..." : "Sí, cancelar mi reserva"}
          </GlassButton>
          {error && <p className="mt-3 text-sm font-semibold text-[var(--danger-900)]">{error}</p>}
        </>
      )}
    </GlassCard>
  );
}
