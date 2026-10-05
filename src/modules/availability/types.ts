/** The entire availability model, in one shape: a date is open exactly
 * during the ranges that exist for it. Zero ranges = fully blocked. */
export interface AvailabilityRange {
  id: string;
  date: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
}

/** Per-date snapshot for the admin calendar — every date in a month view
 * gets one of these, `ranges` empty meaning fully blocked. */
export interface DayOverview {
  date: string; // "YYYY-MM-DD"
  ranges: AvailabilityRange[];
}
