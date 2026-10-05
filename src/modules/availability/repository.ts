import { prisma } from "@/lib/prisma";

export const availabilityRepository = {
  findRangesForDate(date: string) {
    return prisma.availabilityRange.findMany({ where: { date }, orderBy: { horaInicio: "asc" } });
  },
  findRangesInRange(fromDate: string, toDate: string) {
    return prisma.availabilityRange.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      orderBy: [{ date: "asc" }, { horaInicio: "asc" }],
    });
  },
  createRange(date: string, horaInicio: string, horaFin: string) {
    return prisma.availabilityRange.create({ data: { date, horaInicio, horaFin } });
  },
  updateRange(id: string, horaInicio: string, horaFin: string) {
    return prisma.availabilityRange.update({ where: { id }, data: { horaInicio, horaFin } });
  },
  deleteRange(id: string) {
    return prisma.availabilityRange.delete({ where: { id } });
  },
  deleteRangesForDate(date: string) {
    return prisma.availabilityRange.deleteMany({ where: { date } });
  },

  findConfirmedAppointmentsForDate(date: string) {
    return prisma.appointment.findMany({
      where: { date, status: "confirmed" },
      select: { horaInicio: true, horaFin: true },
    });
  },
};
