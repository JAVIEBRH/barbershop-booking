import { revenueRepository } from "./repository";
import { computeTotalRevenue, computeMonthlyRevenue } from "./domain/aggregate";
import { todayInBusinessTimezone } from "@/lib/time";
import type { RevenueSummary } from "./types";

export const revenueService = {
  async getSummary(): Promise<RevenueSummary> {
    const rows = await revenueRepository.findAllConfirmed();
    const appointments = rows.map((r) => ({ date: r.date, price: r.servicePriceSnapshot }));
    const today = todayInBusinessTimezone();
    return {
      total: computeTotalRevenue(appointments, today),
      monthly: computeMonthlyRevenue(appointments, today),
    };
  },
};
