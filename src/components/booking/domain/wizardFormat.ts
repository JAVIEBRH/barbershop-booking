export { formatDateLong } from "@/lib/dateFormat";

/** Adds `minutes` to an "HH:mm" string, wrapping at 24h. */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/** "2026-08" month key for a "YYYY-MM-DD" date string — used to compare
 * calendar navigation bounds against the fetched free-days window. */
export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}
