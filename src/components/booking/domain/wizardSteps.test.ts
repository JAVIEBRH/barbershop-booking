import { describe, it, expect } from "vitest";
import { STEP_ORDER, canAdvance, nextStep, prevStep } from "./wizardSteps";

describe("wizardSteps", () => {
  it("has the 5 steps in order", () => {
    expect(STEP_ORDER).toEqual(["service", "day", "time", "confirm", "success"]);
  });

  it("cannot advance from service without a serviceId", () => {
    expect(canAdvance("service", { serviceId: null, date: null, slot: null })).toBe(false);
    expect(canAdvance("service", { serviceId: "s1", date: null, slot: null })).toBe(true);
  });

  it("cannot advance from day without a date", () => {
    expect(canAdvance("day", { serviceId: "s1", date: null, slot: null })).toBe(false);
    expect(canAdvance("day", { serviceId: "s1", date: "2026-08-25", slot: null })).toBe(true);
  });

  it("cannot advance from time without a slot", () => {
    expect(canAdvance("time", { serviceId: "s1", date: "2026-08-25", slot: null })).toBe(false);
    expect(canAdvance("time", { serviceId: "s1", date: "2026-08-25", slot: "10:00" })).toBe(true);
  });

  it("confirm and success always allow advancing (form validity handled by the form itself)", () => {
    expect(canAdvance("confirm", { serviceId: "s1", date: "2026-08-25", slot: "10:00" })).toBe(true);
    expect(canAdvance("success", { serviceId: "s1", date: "2026-08-25", slot: "10:00" })).toBe(true);
  });

  it("nextStep/prevStep walk the order and return null at the ends", () => {
    expect(nextStep("service")).toBe("day");
    expect(nextStep("success")).toBeNull();
    expect(prevStep("day")).toBe("service");
    expect(prevStep("service")).toBeNull();
  });
});
