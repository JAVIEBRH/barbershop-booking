import { formatDateLong } from "@/lib/dateFormat";

/** Shared HTML shell for both emails. A plain top-level <div> isn't enough
 * for a dark background to actually cover the whole message: without a
 * real <html><body> and a full-width table, most webmail clients (Gmail
 * included) wrap the fragment in their own default white body, which
 * bleeds through as a white gutter around the card — that was the "high
 * contrast / white background" the barber reported. Table-based full-bleed
 * layout is the standard fix (also the most compatible across clients);
 * the color-scheme meta tags stop clients from re-inverting our
 * already-dark design in their own "dark mode" pass. */
function emailShell(logoUrl: string, bodyHtml: string): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </head>
      <body style="margin:0; padding:0; background-color:#070a09;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070a09; margin:0; padding:0; border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; max-width:480px; background-color:#0d1512; border:1px solid rgba(255,255,255,0.12); border-radius:16px; border-collapse:separate;">
                <tr>
                  <td style="padding:32px 24px; text-align:center;">
                    <img src="${logoUrl}" alt="Barber Studio" width="120" height="120" style="display:block; margin:0 auto 20px; border-radius:50%;" />
                    <div style="text-align:left; color:#f5f7f6; font-family:Arial, Helvetica, sans-serif;">
                      ${bodyHtml}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export interface BookingConfirmationData {
  clientName: string;
  date: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  cancelUrl: string;
  logoUrl: string;
}

export function bookingConfirmationSubject(): string {
  return "Tu reserva fue confirmada";
}

export function bookingConfirmationHtml(data: BookingConfirmationData): string {
  return emailShell(
    data.logoUrl,
    `
      <h2 style="color:#f5f7f6; margin:0 0 12px;">¡Reserva confirmada, ${data.clientName}!</h2>
      <p style="color:#f5f7f6; margin:0 0 8px;">Te esperamos el <strong style="color:#d9a34a;">${formatDateLong(data.date)}</strong>, a las <strong style="color:#d9a34a;">${data.horaInicio}</strong> horas.</p>
      <p style="color:rgba(245,247,246,0.65); margin:20px 0 0;">
        ¿No puedes venir?
        <a href="${data.cancelUrl}" style="color:#d9a34a; font-weight:bold;">Cancela tu hora aquí</a>.
      </p>
    `
  );
}

export interface BarberNotificationData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  date: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  logoUrl: string;
}

export function barberNotificationSubject(data: Pick<BarberNotificationData, "clientName">): string {
  return `Nueva reserva: ${data.clientName}`;
}

export function barberNotificationHtml(data: BarberNotificationData): string {
  return emailShell(
    data.logoUrl,
    `
      <h2 style="color:#f5f7f6; margin:0 0 12px;">Nueva reserva</h2>
      <p style="color:#f5f7f6; margin:0 0 8px;">
        <strong>${data.clientName}</strong> agendó <strong style="color:#d9a34a;">${data.serviceName}</strong>
        el <strong style="color:#d9a34a;">${formatDateLong(data.date)}</strong>, a las <strong style="color:#d9a34a;">${data.horaInicio}</strong> horas.
      </p>
      <p style="color:rgba(245,247,246,0.65); margin:16px 0 0;">Teléfono: <strong style="color:#f5f7f6;">${data.clientPhone}</strong></p>
      <p style="color:rgba(245,247,246,0.65); margin:4px 0 0;">Email: <strong style="color:#f5f7f6;">${data.clientEmail}</strong></p>
    `
  );
}
