import { availabilityRepository } from "./repository";
import { computeFreeSlots } from "./domain/slots";
import { enumerateDateRange } from "./domain/dateRange";
import { rangesOverlap, type TimeRange } from "@/modules/booking/domain/overlap";
import type { AvailabilityRange, DayOverview } from "./types";

// What "unblocking a day" fills in by default — every date starts with
// zero ranges (fully blocked); the barber narrows or splits this from the
// calendar's fine-tune editor afterward if a particular day needs it.
const DEFAULT_OPEN_START = "09:00";
const DEFAULT_OPEN_END = "19:00";

function toRange(r: { id: string; date: string; horaInicio: string; horaFin: string }): AvailabilityRange {
  return { id: r.id, date: r.date, horaInicio: r.horaInicio, horaFin: r.horaFin };
}

async function assertNoOverlap(date: string, horaInicio: string, horaFin: string, excludeId?: string) {
  if (horaInicio >= horaFin) {
    throw new Error("La hora de inicio debe ser antes que la hora de término");
  }
  const existing = await availabilityRepository.findRangesForDate(date);
  const candidate: TimeRange = { horaInicio, horaFin };
  const overlaps = existing.some((r) => r.id !== excludeId && rangesOverlap(candidate, r));
  if (overlaps) {
    throw new Error("Ese horario se cruza con uno que ya existe ese día");
  }
}

export const availabilityService = {
  async getFreeSlotsForDate(date: string, serviceDurationMinutes: number): Promise<string[]> {
    const ranges = await availabilityRepository.findRangesForDate(date);
    if (ranges.length === 0) return [];

    const confirmed = await availabilityRepository.findConfirmedAppointmentsForDate(date);
    const busy: TimeRange[] = confirmed.map((a) => ({ horaInicio: a.horaInicio, horaFin: a.horaFin }));
    const slots = new Set<string>();
    for (const r of ranges) {
      for (const slot of computeFreeSlots({ openTime: r.horaInicio, closeTime: r.horaFin }, serviceDurationMinutes, busy)) {
        slots.add(slot);
      }
    }
    return [...slots].sort();
  },

  async getFreeDaysInRange(fromDate: string, toDate: string, serviceDurationMinutes: number): Promise<string[]> {
    const days: string[] = [];
    for (const dateStr of enumerateDateRange(fromDate, toDate)) {
      const slots = await this.getFreeSlotsForDate(dateStr, serviceDurationMinutes);
      if (slots.length > 0) days.push(dateStr);
    }
    return days;
  },

  /** Per-date ranges for the admin calendar — every date in the window
   * gets an entry, empty `ranges` meaning fully blocked. Batch-fetched
   * (one query, not one per day) since a month view covers 30+ dates. */
  async getMonthOverview(fromDate: string, toDate: string): Promise<DayOverview[]> {
    const rows = await availabilityRepository.findRangesInRange(fromDate, toDate);
    const byDate = new Map<string, AvailabilityRange[]>();
    for (const r of rows) {
      const list = byDate.get(r.date) ?? [];
      list.push(toRange(r));
      byDate.set(r.date, list);
    }
    return enumerateDateRange(fromDate, toDate).map((date) => ({ date, ranges: byDate.get(date) ?? [] }));
  },

  /** The calendar's one primary action: flips a fully-blocked date open
   * with a sensible default window. A no-op if the date already has at
   * least one range — turning it back off is `blockDay`, not this. */
  async unblockDay(date: string): Promise<void> {
    const existing = await availabilityRepository.findRangesForDate(date);
    if (existing.length === 0) {
      await availabilityRepository.createRange(date, DEFAULT_OPEN_START, DEFAULT_OPEN_END);
    }
  },

  /** The calendar's other primary action: clears every range for the
   * date, back to fully blocked. */
  async blockDay(date: string): Promise<void> {
    await availabilityRepository.deleteRangesForDate(date);
  },

  /** Fine-tune editor: add one more range to a date (e.g. splitting a
   * lunch break, or opening just an early/late hour). */
  async addRange(date: string, horaInicio: string, horaFin: string): Promise<void> {
    await assertNoOverlap(date, horaInicio, horaFin);
    await availabilityRepository.createRange(date, horaInicio, horaFin);
  },

  async updateRange(id: string, date: string, horaInicio: string, horaFin: string): Promise<void> {
    await assertNoOverlap(date, horaInicio, horaFin, id);
    await availabilityRepository.updateRange(id, horaInicio, horaFin);
  },

  async removeRange(id: string): Promise<void> {
    await availabilityRepository.deleteRange(id);
  },
};
