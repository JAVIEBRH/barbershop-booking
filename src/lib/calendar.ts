/** Pure calendar-grid math, all UTC-anchored so it never depends on the
 * server's or the browser's local timezone (a calendar date/weekday is
 * invariant once you don't shift the date itself — see src/lib/time.ts). */

export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Number of days in `month` (1-12) of `year`. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Day of week (0=Sunday..6=Saturday) of the 1st of `month` (1-12). */
export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** `dateStr` ("YYYY-MM-DD") shifted by `days` (negative goes back), still
 * "YYYY-MM-DD". UTC-anchored like the rest of this module, so it can't
 * drift a day from a DST transition in some other timezone. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return toDateStr(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** The 7 consecutive "YYYY-MM-DD" dates of the Monday-to-Sunday week that
 * `dateStr` falls in, Monday first — used for the admin's week-at-a-glance
 * agenda. */
export function weekDatesStartingMonday(dateStr: string): string[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  const sundayFirstWeekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayOffset = (sundayFirstWeekday + 6) % 7; // days since this week's Monday
  const monday = addDays(dateStr, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
