import { describe, it, expect } from "vitest";
import { enumerateDateRange } from "./dateRange";

describe("enumerateDateRange", () => {
  it("includes both endpoints for a normal range", () => {
    expect(enumerateDateRange("2026-08-20", "2026-08-23")).toEqual([
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
  });

  it("returns a single date when from equals to", () => {
    expect(enumerateDateRange("2026-08-20", "2026-08-20")).toEqual(["2026-08-20"]);
  });

  it("returns an empty array when the range is reversed", () => {
    expect(enumerateDateRange("2026-08-23", "2026-08-20")).toEqual([]);
  });

  it("spans a month boundary correctly", () => {
    expect(enumerateDateRange("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("caps at 366 days to guard against pathological ranges", () => {
    const result = enumerateDateRange("2026-01-01", "2030-01-01");
    expect(result).toHaveLength(366);
  });
});
