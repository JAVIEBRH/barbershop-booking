"use server";

import { bookingService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";
import type { CreateAppointmentInput } from "./types";

export async function createAppointmentAction(input: CreateAppointmentInput) {
  return bookingService.createAppointment(input);
}

export async function cancelAppointmentAction(id: string) {
  await requireAdminSession();
  await bookingService.cancelAppointment(id);
}

export async function listUpcomingAppointmentsAction() {
  await requireAdminSession();
  return bookingService.listUpcoming();
}

export async function listAppointmentsInRangeAction(fromDate: string, toDate: string) {
  await requireAdminSession();
  return bookingService.listInRange(fromDate, toDate);
}

// Public — no requireAdminSession. Authorization here is the unguessable
// cancelToken itself (from the confirmation email/success screen), not a
// session; see bookingService.getAppointmentByCancelToken.
export async function getAppointmentByCancelTokenAction(cancelToken: string) {
  return bookingService.getAppointmentByCancelToken(cancelToken);
}

export async function cancelAppointmentByTokenAction(cancelToken: string) {
  await bookingService.cancelAppointmentByToken(cancelToken);
}
