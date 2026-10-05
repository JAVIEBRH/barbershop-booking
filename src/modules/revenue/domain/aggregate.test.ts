import { describe, it, expect } from "vitest";
import { computeTotalRevenue, computeMonthlyRevenue } from "./aggregate";

const today = "2026-08-21";

describe("computeTotalRevenue", () => {
  it("sums only appointments strictly before today", () => {
    const total = computeTotalRevenue(
      [
        { date: "2026-08-19", price: 8000 },
        { date: "2026-08-20", price: 5000 },
        { date: "2026-08-21", price: 9999 }, // today — not counted yet
        { date: "2026-08-22", price: 7777 }, // future — not counted
      ],
      today
    );
    expect(total).toBe(13000);
  });

  it("returns 0 for an empty list", () => {
    expect(computeTotalRevenue([], today)).toBe(0);
  });
});

describe("computeMonthlyRevenue", () => {
  it("groups past appointments by YYYY-MM, sorted chronologically", () => {
    const result = computeMonthlyRevenue(
      [
        { date: "2026-07-05", price: 5000 },
        { date: "2026-08-01", price: 8000 },
        { date: "2026-08-15", price: 4000 },
        { date: "2026-08-21", price: 9999 }, // today, excluded
      ],
      today
    );
    expect(result).toEqual([
      { month: "2026-07", total: 5000 },
      { month: "2026-08", total: 12000 },
    ]);
  });

  it("returns an empty array when there are no past appointments", () => {
    expect(computeMonthlyRevenue([{ date: "2026-08-21", price: 9999 }], today)).toEqual([]);
  });
});
