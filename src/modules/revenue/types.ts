export interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  total: number;
}

export interface RevenueSummary {
  total: number;
  monthly: MonthlyRevenue[];
}
