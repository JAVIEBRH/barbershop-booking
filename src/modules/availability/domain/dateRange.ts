import { addDaysToDateStr } from "@/lib/time";

const MAX_RANGE_DAYS = 366;

/** Every "YYYY-MM-DD" date from `fromDate` to `toDate` inclusive. Returns
 * [] for a reversed range, and caps at MAX_RANGE_DAYS to guard against a
 * mistyped end date accidentally blocking years of availability. */
export function enumerateDateRange(fromDate: string, toDate: string): string[] {
  if (fromDate > toDate) return [];
  const dates: string[] = [];
  let cursor = fromDate;
  for (let i = 0; i < MAX_RANGE_DAYS && cursor <= toDate; i++) {
    dates.push(cursor);
    cursor = addDaysToDateStr(cursor, 1);
  }
  return dates;
}
