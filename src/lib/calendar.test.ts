import { describe, it, expect } from "vitest";
import { addDays, daysInMonth, firstWeekdayOfMonth, toDateStr, weekDatesStartingMonday } from "./calendar";

describe("daysInMonth", () => {
  it("returns 31 for August 2026", () => {
    expect(daysInMonth(2026, 8)).toBe(31);
  });

  it("returns 28 for February 2026 (not a leap year)", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("returns 29 for February 2028 (a leap year)", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});

describe("firstWeekdayOfMonth", () => {
  it("matches the real-world weekday for August 2026 (Aug 1 2026 is a Saturday)", () => {
    expect(firstWeekdayOfMonth(2026, 8)).toBe(6);
  });
});

describe("toDateStr", () => {
  it("zero-pads month and day", () => {
    expect(toDateStr(2026, 8, 5)).toBe("2026-08-05");
  });
});

describe("addDays", () => {
  it("rolls over into the next month", () => {
    expect(addDays("2026-08-31", 6)).toBe("2026-09-06");
  });

  it("rolls back into the previous month with a negative offset", () => {
    expect(addDays("2026-08-01", -1)).toBe("2026-07-31");
  });
});

describe("weekDatesStartingMonday", () => {
  it("returns Monday..Sunday for a date that is itself a Monday (Aug 31 2026)", () => {
    expect(weekDatesStartingMonday("2026-08-31")).toEqual([
      "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03",
      "2026-09-04", "2026-09-05", "2026-09-06",
    ]);
  });

  it("a Sunday belongs to the week that started the previous Monday (Aug 30 2026)", () => {
    expect(weekDatesStartingMonday("2026-08-30")).toEqual([
      "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27",
      "2026-08-28", "2026-08-29", "2026-08-30",
    ]);
  });
});
