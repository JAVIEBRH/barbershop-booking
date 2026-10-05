"use server";

import { revalidatePath } from "next/cache";
import { availabilityService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";
import { todayInBusinessTimezone, addDaysToDateStr } from "@/lib/time";

// Next.js only re-renders the current route after a Server Action when the
// action itself triggers it (revalidatePath/updateTag/refresh/cookies
// mutation/redirect) — otherwise the mutation succeeds but the page the
// admin is looking at stays stale until a manual reload. Every mutating
// action below calls this so /admin/disponibilidad reflects the change in
// the same round trip the form submit already does.
const DISPONIBILIDAD_PATH = "/admin/disponibilidad";

/** `daysAhead` is a window size (e.g. 28), not a client-supplied date —
 * "today" is always computed server-side in BUSINESS_TIMEZONE so a
 * visitor's local clock/timezone can never skew which days are offered. */
export async function getFreeDaysAction(daysAhead: number, serviceDurationMinutes: number) {
  const from = todayInBusinessTimezone();
  const to = addDaysToDateStr(from, daysAhead);
  return availabilityService.getFreeDaysInRange(from, to, serviceDurationMinutes);
}

export async function getFreeSlotsAction(date: string, serviceDurationMinutes: number) {
  return availabilityService.getFreeSlotsForDate(date, serviceDurationMinutes);
}

export async function getMonthOverviewAction(fromDate: string, toDate: string) {
  await requireAdminSession();
  return availabilityService.getMonthOverview(fromDate, toDate);
}

export async function unblockDayAction(date: string) {
  await requireAdminSession();
  await availabilityService.unblockDay(date);
  revalidatePath(DISPONIBILIDAD_PATH);
}

export async function blockDayAction(date: string) {
  await requireAdminSession();
  await availabilityService.blockDay(date);
  revalidatePath(DISPONIBILIDAD_PATH);
}

export async function addRangeAction(date: string, horaInicio: string, horaFin: string) {
  await requireAdminSession();
  await availabilityService.addRange(date, horaInicio, horaFin);
  revalidatePath(DISPONIBILIDAD_PATH);
}

export async function updateRangeAction(id: string, date: string, horaInicio: string, horaFin: string) {
  await requireAdminSession();
  await availabilityService.updateRange(id, date, horaInicio, horaFin);
  revalidatePath(DISPONIBILIDAD_PATH);
}

export async function removeRangeAction(id: string) {
  await requireAdminSession();
  await availabilityService.removeRange(id);
  revalidatePath(DISPONIBILIDAD_PATH);
}
