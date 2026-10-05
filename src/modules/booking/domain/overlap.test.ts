import { describe, it, expect } from "vitest";
import { rangesOverlap } from "./overlap";

describe("rangesOverlap", () => {
  it("returns true when ranges overlap partially", () => {
    expect(
      rangesOverlap(
        { horaInicio: "10:00", horaFin: "10:30" },
        { horaInicio: "10:15", horaFin: "10:45" }
      )
    ).toBe(true);
  });

  it("returns false when ranges are back-to-back (touching, not overlapping)", () => {
    expect(
      rangesOverlap(
        { horaInicio: "10:00", horaFin: "10:30" },
        { horaInicio: "10:30", horaFin: "11:00" }
      )
    ).toBe(false);
  });

  it("returns false when ranges are disjoint", () => {
    expect(
      rangesOverlap(
        { horaInicio: "09:00", horaFin: "09:30" },
        { horaInicio: "10:00", horaFin: "10:30" }
      )
    ).toBe(false);
  });

  it("returns true when one range fully contains the other", () => {
    expect(
      rangesOverlap(
        { horaInicio: "09:00", horaFin: "12:00" },
        { horaInicio: "10:00", horaFin: "10:30" }
      )
    ).toBe(true);
  });
});
