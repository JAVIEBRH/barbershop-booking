import { prisma } from "@/lib/prisma";

export const revenueRepository = {
  findAllConfirmed() {
    return prisma.appointment.findMany({
      where: { status: "confirmed" },
      select: { date: true, servicePriceSnapshot: true },
    });
  },
};
