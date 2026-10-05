import { describe, it, expect } from "vitest";
import { computeFreeSlots } from "./slots";

describe("computeFreeSlots", () => {
  it("returns evenly stepped slots across the open window when nothing is busy", () => {
    const slots = computeFreeSlots(
      { openTime: "10:00", closeTime: "11:00" },
      30,
      []
    );
    expect(slots).toEqual(["10:00", "10:15", "10:30"]);
  });

  it("excludes slots that would overlap a busy range", () => {
    // Busy 10:30-11:00 leaves only a 30-minute gap at the very start (10:00-10:30).
    // Every other candidate start (10:15, 10:30, ...) overlaps the busy block.
    const slots = computeFreeSlots(
      { openTime: "10:00", closeTime: "11:00" },
      30,
      [{ horaInicio: "10:30", horaFin: "11:00" }]
    );
    expect(slots).toEqual(["10:00"]);
  });

  it("returns no slots when the service duration doesn't fit in the window", () => {
    const slots = computeFreeSlots(
      { openTime: "10:00", closeTime: "10:20" },
      30,
      []
    );
    expect(slots).toEqual([]);
  });
});
