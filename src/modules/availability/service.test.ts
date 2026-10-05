import { describe, it, expect, vi, beforeEach } from "vitest";
import { availabilityService } from "./service";
import { availabilityRepository } from "./repository";

vi.mock("./repository", () => ({
  availabilityRepository: {
    findRangesForDate: vi.fn(),
    findRangesInRange: vi.fn(),
    createRange: vi.fn(),
    updateRange: vi.fn(),
    deleteRange: vi.fn(),
    deleteRangesForDate: vi.fn(),
    findConfirmedAppointmentsForDate: vi.fn(),
  },
}));

describe("availabilityService.getFreeSlotsForDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns no slots for a fully blocked date (no ranges)", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([]);

    const slots = await availabilityService.getFreeSlotsForDate("2026-09-05", 30);

    expect(slots).toEqual([]);
    expect(availabilityRepository.findConfirmedAppointmentsForDate).not.toHaveBeenCalled();
  });

  it("combines slots across every range on the date (e.g. a lunch-break split)", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "09:00", horaFin: "10:00" },
      { id: "r2", date: "2026-09-05", horaInicio: "14:00", horaFin: "15:00" },
    ] as never);
    vi.mocked(availabilityRepository.findConfirmedAppointmentsForDate).mockResolvedValue([]);

    const slots = await availabilityService.getFreeSlotsForDate("2026-09-05", 30);

    expect(slots).toEqual(["09:00", "09:15", "09:30", "14:00", "14:15", "14:30"]);
  });

  it("excludes slots that overlap a confirmed appointment", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "10:00", horaFin: "11:00" },
    ] as never);
    vi.mocked(availabilityRepository.findConfirmedAppointmentsForDate).mockResolvedValue([
      { horaInicio: "10:30", horaFin: "11:00" },
    ] as never);

    const slots = await availabilityService.getFreeSlotsForDate("2026-09-05", 30);

    expect(slots).toEqual(["10:00"]);
  });
});

describe("availabilityService.getMonthOverview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gives every date in the window an entry, empty ranges for fully blocked dates", async () => {
    vi.mocked(availabilityRepository.findRangesInRange).mockResolvedValue([
      { id: "r1", date: "2026-09-02", horaInicio: "09:00", horaFin: "19:00" },
    ] as never);

    const overview = await availabilityService.getMonthOverview("2026-09-01", "2026-09-03");

    expect(overview).toEqual([
      { date: "2026-09-01", ranges: [] },
      { date: "2026-09-02", ranges: [{ id: "r1", date: "2026-09-02", horaInicio: "09:00", horaFin: "19:00" }] },
      { date: "2026-09-03", ranges: [] },
    ]);
  });
});

describe("availabilityService.unblockDay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds a default full-day range when the date has none", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([]);

    await availabilityService.unblockDay("2026-09-05");

    expect(availabilityRepository.createRange).toHaveBeenCalledWith("2026-09-05", "09:00", "19:00");
  });

  it("is a no-op when the date is already unblocked", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "09:00", horaFin: "19:00" },
    ] as never);

    await availabilityService.unblockDay("2026-09-05");

    expect(availabilityRepository.createRange).not.toHaveBeenCalled();
  });
});

describe("availabilityService.blockDay", () => {
  it("deletes every range for the date", async () => {
    await availabilityService.blockDay("2026-09-05");

    expect(availabilityRepository.deleteRangesForDate).toHaveBeenCalledWith("2026-09-05");
  });
});

describe("availabilityService.addRange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when horaInicio is not before horaFin", async () => {
    await expect(availabilityService.addRange("2026-09-05", "18:00", "10:00")).rejects.toThrow(
      /hora de inicio debe ser antes/i
    );
    expect(availabilityRepository.createRange).not.toHaveBeenCalled();
  });

  it("rejects a range that overlaps an existing one on the same date", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "09:00", horaFin: "13:00" },
    ] as never);

    await expect(availabilityService.addRange("2026-09-05", "12:00", "14:00")).rejects.toThrow(/se cruza/i);
    expect(availabilityRepository.createRange).not.toHaveBeenCalled();
  });

  it("creates the range when it doesn't overlap anything", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "09:00", horaFin: "13:00" },
    ] as never);

    await availabilityService.addRange("2026-09-05", "14:00", "19:00");

    expect(availabilityRepository.createRange).toHaveBeenCalledWith("2026-09-05", "14:00", "19:00");
  });
});

describe("availabilityService.updateRange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excludes the range's own id when checking for overlaps", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "09:00", horaFin: "13:00" },
    ] as never);

    await availabilityService.updateRange("r1", "2026-09-05", "09:30", "13:30");

    expect(availabilityRepository.updateRange).toHaveBeenCalledWith("r1", "09:30", "13:30");
  });

  it("still rejects a change that would overlap a different range", async () => {
    vi.mocked(availabilityRepository.findRangesForDate).mockResolvedValue([
      { id: "r1", date: "2026-09-05", horaInicio: "09:00", horaFin: "13:00" },
      { id: "r2", date: "2026-09-05", horaInicio: "14:00", horaFin: "19:00" },
    ] as never);

    await expect(availabilityService.updateRange("r1", "2026-09-05", "09:00", "14:30")).rejects.toThrow(/se cruza/i);
    expect(availabilityRepository.updateRange).not.toHaveBeenCalled();
  });
});

describe("availabilityService.removeRange", () => {
  it("deletes the range by id", async () => {
    await availabilityService.removeRange("r1");

    expect(availabilityRepository.deleteRange).toHaveBeenCalledWith("r1");
  });
});
