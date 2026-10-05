export interface RevenueAppointment {
  date: string; // "YYYY-MM-DD"
  price: number;
}

export interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  total: number;
}

/** "Already generated" = confirmed appointments strictly before today.
 * Today's own appointments may not have happened yet, so they're excluded
 * until tomorrow — conservative on purpose for a revenue figure. */
function isPast(date: string, todayStr: string): boolean {
  return date < todayStr;
}

export function computeTotalRevenue(appointments: RevenueAppointment[], todayStr: string): number {
  return appointments
    .filter((a) => isPast(a.date, todayStr))
    .reduce((sum, a) => sum + a.price, 0);
}

export function computeMonthlyRevenue(appointments: RevenueAppointment[], todayStr: string): MonthlyRevenue[] {
  const byMonth = new Map<string, number>();
  for (const a of appointments) {
    if (!isPast(a.date, todayStr)) continue;
    const month = a.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + a.price);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}
