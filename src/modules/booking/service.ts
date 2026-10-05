import { bookingRepository } from "./repository";
import { availabilityService } from "@/modules/availability/service";
import { sendBarberNotification, sendBookingConfirmation } from "@/modules/notifications/email";
import type { AppointmentResult, AppointmentSummary, CreateAppointmentInput } from "./types";

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function toSummary(r: {
  id: string;
  date: string;
  horaInicio: string;
  horaFin: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  status: string;
  servicePriceSnapshot: number;
  cancelToken: string;
  service: { name: string };
}): AppointmentSummary {
  return {
    id: r.id,
    date: r.date,
    horaInicio: r.horaInicio,
    horaFin: r.horaFin,
    clientName: r.clientName,
    clientPhone: r.clientPhone,
    clientEmail: r.clientEmail,
    status: r.status,
    serviceName: r.service.name,
    price: r.servicePriceSnapshot,
    cancelToken: r.cancelToken,
  };
}

export const bookingService = {
  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentResult> {
    const existing = await bookingRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const { durationMinutes, price, name: serviceName } = await bookingRepository.getServiceForBooking(input.serviceId);
    const freeSlots = await availabilityService.getFreeSlotsForDate(input.date, durationMinutes);
    if (!freeSlots.includes(input.horaInicio)) {
      throw new Error("Ese horario ya no está disponible, por favor elige otro.");
    }

    const horaFin = addMinutes(input.horaInicio, durationMinutes);

    let created;
    try {
      created = await bookingRepository.createInTransaction({ ...input, horaFin, servicePriceSnapshot: price });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        throw new Error("Ese horario ya no está disponible, por favor elige otro.");
      }
      throw err;
    }

    // Both notifications are best-effort and independent of each other — the booking
    // itself already succeeded, and one failing (e.g. a bad client email) must not
    // suppress the other (the barber still needs to know about the appointment).
    await Promise.allSettled([
      sendBookingConfirmation({
        to: input.clientEmail,
        clientName: input.clientName,
        date: input.date,
        horaInicio: input.horaInicio,
        cancelToken: created.cancelToken,
      }),
      sendBarberNotification({
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        serviceName,
        date: input.date,
        horaInicio: input.horaInicio,
      }),
    ]);

    return created;
  },

  async cancelAppointment(id: string): Promise<void> {
    await bookingRepository.cancel(id);
  },

  /** Public, client-facing lookup for the self-cancellation page — keyed by
   * the opaque cancelToken from the confirmation email/success screen, never
   * by the row id (which would let one client enumerate/cancel another's
   * appointment). Returns null rather than throwing so the page can render
   * a plain "not found" state for a bad/reused link. */
  async getAppointmentByCancelToken(cancelToken: string): Promise<AppointmentSummary | null> {
    const row = await bookingRepository.findByCancelToken(cancelToken);
    return row ? toSummary(row) : null;
  },

  /** Idempotent: cancelling an already-cancelled appointment is a no-op, not
   * an error — an email client/link scanner re-fetching the link, or the
   * client tapping the button twice, shouldn't surface a scary failure. */
  async cancelAppointmentByToken(cancelToken: string): Promise<void> {
    const row = await bookingRepository.findByCancelToken(cancelToken);
    if (!row) throw new Error("No encontramos esa reserva.");
    if (row.status === "cancelled") return;
    await bookingRepository.cancel(row.id);
  },

  async listUpcoming(): Promise<AppointmentSummary[]> {
    const rows = await bookingRepository.listUpcomingConfirmed();
    return rows.map(toSummary);
  },

  async listInRange(fromDate: string, toDate: string): Promise<AppointmentSummary[]> {
    const rows = await bookingRepository.listConfirmedInRange(fromDate, toDate);
    return rows.map(toSummary);
  },
};
