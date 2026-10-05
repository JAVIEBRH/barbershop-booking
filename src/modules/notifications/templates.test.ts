import { describe, expect, it } from "vitest";
import { barberNotificationHtml, barberNotificationSubject, bookingConfirmationHtml } from "./templates";

describe("barberNotificationSubject", () => {
  it("mentions the client name so the barber can scan the inbox", () => {
    expect(barberNotificationSubject({ clientName: "Juan Pérez" })).toBe(
      "Nueva reserva: Juan Pérez"
    );
  });
});

describe("barberNotificationHtml", () => {
  it("includes client name, phone, service, date and time", () => {
    const html = barberNotificationHtml({
      clientName: "Juan Pérez",
      clientPhone: "+56912345678",
      clientEmail: "juan@example.com",
      serviceName: "Corte + Barba",
      date: "2026-08-25",
      horaInicio: "15:30",
      logoUrl: "https://barberstudio.example.com/email-logo.png",
    });

    expect(html).toContain("Juan Pérez");
    expect(html).toContain("+56912345678");
    expect(html).toContain("juan@example.com");
    expect(html).toContain("Corte + Barba");
    expect(html).toContain("Martes 25 de Agosto");
    expect(html).toContain("15:30");
  });

  it("embeds the logo image", () => {
    const html = barberNotificationHtml({
      clientName: "Juan Pérez",
      clientPhone: "+56912345678",
      clientEmail: "juan@example.com",
      serviceName: "Corte + Barba",
      date: "2026-08-25",
      horaInicio: "15:30",
      logoUrl: "https://barberstudio.example.com/email-logo.png",
    });

    expect(html).toContain('<img src="https://barberstudio.example.com/email-logo.png"');
  });
});

describe("bookingConfirmationHtml", () => {
  it("includes the client name, date, time, cancel link and logo", () => {
    const html = bookingConfirmationHtml({
      clientName: "Juan Pérez",
      date: "2026-08-25",
      horaInicio: "15:30",
      cancelUrl: "https://barberstudio.example.com/reservas/cancelar/abc123",
      logoUrl: "https://barberstudio.example.com/email-logo.png",
    });

    expect(html).toContain("Juan Pérez");
    expect(html).toContain("Martes 25 de Agosto");
    expect(html).toContain("15:30");
    expect(html).toContain('href="https://barberstudio.example.com/reservas/cancelar/abc123"');
    expect(html).toContain('<img src="https://barberstudio.example.com/email-logo.png"');
  });
});
