import { describe, it, expect } from "vitest";
import { addMinutes, formatDateLong, monthKeyOf } from "./wizardFormat";

describe("addMinutes", () => {
  it("adds minutes within the same hour", () => {
    expect(addMinutes("11:00", 30)).toBe("11:30");
  });

  it("rolls over to the next hour", () => {
    expect(addMinutes("11:45", 30)).toBe("12:15");
  });

  it("wraps past midnight", () => {
    expect(addMinutes("23:30", 90)).toBe("01:00");
  });
});

describe("formatDateLong", () => {
  it("formats a date as weekday + day + month in Spanish", () => {
    expect(formatDateLong("2026-08-25")).toBe("Martes 25 de Agosto");
  });
});

describe("monthKeyOf", () => {
  it("extracts the YYYY-MM prefix", () => {
    expect(monthKeyOf("2026-08-25")).toBe("2026-08");
  });
});
