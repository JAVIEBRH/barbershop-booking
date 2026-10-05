import { Resend } from "resend";
import { env } from "@/lib/env";
import {
  barberNotificationHtml,
  barberNotificationSubject,
  bookingConfirmationHtml,
  bookingConfirmationSubject,
} from "./templates";

const resend = new Resend(env.RESEND_API_KEY);
const FROM = "Barber Studio <reservas@barberstudio.example.com>"; // barberstudio.example.com verified in Resend 2026-08-31 — was "Reservas <onboarding@resend.dev>" (the shared sender) before
const LOGO_URL = `${env.APP_BASE_URL}/email-logo.png`;

export interface SendBookingConfirmationInput {
  to: string;
  clientName: string;
  date: string;
  horaInicio: string;
  cancelToken: string;
}

export async function sendBookingConfirmation(input: SendBookingConfirmationInput): Promise<void> {
  const cancelUrl = `${env.APP_BASE_URL}/reservas/cancelar/${input.cancelToken}`;
  const { error } = await resend.emails.send({
    from: FROM,
    to: input.to,
    subject: bookingConfirmationSubject(),
    html: bookingConfirmationHtml({
      clientName: input.clientName,
      date: input.date,
      horaInicio: input.horaInicio,
      cancelUrl,
      logoUrl: LOGO_URL,
    }),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

export interface SendBarberNotificationInput {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  horaInicio: string;
}

export async function sendBarberNotification(input: SendBarberNotificationInput): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: env.BARBER_EMAIL.split(",").map((e) => e.trim()),
    subject: barberNotificationSubject({ clientName: input.clientName }),
    html: barberNotificationHtml({ ...input, logoUrl: LOGO_URL }),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
