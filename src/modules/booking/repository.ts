import { prisma } from "@/lib/prisma";
import { todayInBusinessTimezone } from "@/lib/time";
import type { CreateAppointmentInput } from "./types";

interface CreateArgs extends CreateAppointmentInput {
  horaFin: string;
  servicePriceSnapshot: number;
}

export const bookingRepository = {
  findByIdempotencyKey(idempotencyKey: string) {
    return prisma.appointment.findUnique({ where: { idempotencyKey } });
  },

  async getServiceForBooking(serviceId: string): Promise<{ durationMinutes: number; price: number; name: string }> {
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    return { durationMinutes: service.durationMinutes, price: service.price, name: service.name };
  },

  /** Re-checks for an overlapping confirmed appointment and inserts inside one transaction, so the check-then-insert is atomic from this process's point of view. The DB unique index on (date, horaInicio) is the final barrier against a truly concurrent second process. */
  async createInTransaction(input: CreateArgs) {
    return prisma.$transaction(async (tx) => {
      const clashing = await tx.appointment.findFirst({
        where: { date: input.date, horaInicio: input.horaInicio, status: "confirmed" },
      });
      if (clashing) {
        throw Object.assign(new Error("Slot already taken"), { code: "P2002" });
      }
      return tx.appointment.create({
        data: {
          date: input.date,
          horaInicio: input.horaInicio,
          horaFin: input.horaFin,
          serviceId: input.serviceId,
          servicePriceSnapshot: input.servicePriceSnapshot,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail,
          idempotencyKey: input.idempotencyKey,
        },
      });
    });
  },

  listUpcomingConfirmed() {
    const today = todayInBusinessTimezone();
    return prisma.appointment.findMany({
      where: { date: { gte: today }, status: "confirmed" },
      include: { service: true },
      orderBy: [{ date: "asc" }, { horaInicio: "asc" }],
    });
  },

  /** All confirmed appointments whose date falls within [fromDate, toDate] (inclusive), for the admin calendar view. */
  listConfirmedInRange(fromDate: string, toDate: string) {
    return prisma.appointment.findMany({
      where: { date: { gte: fromDate, lte: toDate }, status: "confirmed" },
      include: { service: true },
      orderBy: [{ date: "asc" }, { horaInicio: "asc" }],
    });
  },

  cancel(id: string) {
    return prisma.appointment.update({ where: { id }, data: { status: "cancelled" } });
  },

  findByCancelToken(cancelToken: string) {
    return prisma.appointment.findUnique({ where: { cancelToken }, include: { service: true } });
  },
};
