export interface TimeRange {
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
}

/** Two ranges overlap if one starts before the other ends, both ways. Touching edges (10:30-11:00 vs 10:00-10:30) do NOT count as overlap. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
}
