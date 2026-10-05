import { env } from "./env";

/** "Today" as a YYYY-MM-DD calendar date in the business's fixed timezone —
 * never the server's or the visitor's local timezone. This is the single
 * source of truth for "today" across the app; nothing else should call
 * `new Date().toISOString()` to determine the current business date. */
export function todayInBusinessTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: env.BUSINESS_TIMEZONE }).format(new Date());
}

/** Adds `days` calendar days to a YYYY-MM-DD date string. Pure string/date-math, no timezone involved (a calendar date has no timezone once it's just a date). */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
