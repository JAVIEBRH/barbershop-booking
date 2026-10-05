import { rangesOverlap, type TimeRange } from "@/modules/booking/domain/overlap";

export interface DayAvailability {
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
}

const SLOT_STEP_MINUTES = 15;

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Candidate start times every SLOT_STEP_MINUTES that (a) leave room for the full service duration before closeTime and (b) don't overlap any existing busy range. */
export function computeFreeSlots(
  day: DayAvailability,
  serviceDurationMinutes: number,
  busyRanges: TimeRange[]
): string[] {
  const slots: string[] = [];
  let cursor = day.openTime;

  while (true) {
    const candidateEnd = addMinutes(cursor, serviceDurationMinutes);
    if (candidateEnd > day.closeTime) break;

    const candidate: TimeRange = { horaInicio: cursor, horaFin: candidateEnd };
    const isBusy = busyRanges.some((busy) => rangesOverlap(candidate, busy));
    if (!isBusy) slots.push(cursor);

    cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
  }

  return slots;
}
