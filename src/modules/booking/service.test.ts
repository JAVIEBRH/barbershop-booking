import { describe, it, expect, vi, beforeEach } from "vitest";
import { bookingService } from "./service";
import { bookingRepository } from "./repository";
import { availabilityService } from "@/modules/availability/service";
import { sendBookingConfirmation, sendBarberNotification } from "@/modules/notifications/email";

vi.mock("./repository", () => ({
  bookingRepository: {
    findByIdempotencyKey: vi.fn(),
    createInTransaction: vi.fn(),
    getServiceForBooking: vi.fn(),
    findByCancelToken: vi.fn(),
    cancel: vi.fn(),
  },
}));
vi.mock("@/modules/availability/service", () => ({
  availabilityService: { getFreeSlotsForDate: vi.fn() },
}));
vi.mock("@/modules/notifications/email", () => ({
  sendBookingConfirmation: vi.fn(),
  sendBarberNotification: vi.fn(),
}));

const baseInput = {
  date: "2026-09-01",
  horaInicio: "10:00",
  serviceId: "svc1",
  clientName: "Juan Pérez",
  clientPhone: "+56911111111",
  clientEmail: "juan@example.com",
  idempotencyKey: "key-1",
};

describe("bookingService.createAppointment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the existing appointment when idempotencyKey was already used, without creating a new one", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue({
      id: "existing-1", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("existing-1");
    expect(bookingRepository.createInTransaction).not.toHaveBeenCalled();
  });

  it("rejects when the requested slot is not currently free", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceForBooking).mockResolvedValue({ durationMinutes: 30, price: 8000, name: "Corte" });
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["09:00", "09:30"]); // 10:00 not free

    await expect(bookingService.createAppointment(baseInput)).rejects.toThrow(/no está disponible/i);
    expect(bookingRepository.createInTransaction).not.toHaveBeenCalled();
  });

  it("creates the appointment with a price snapshot and sends a confirmation email when the slot is free", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceForBooking).mockResolvedValue({ durationMinutes: 30, price: 8000, name: "Corte" });
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockResolvedValue({
      id: "new-1", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("new-1");
    expect(bookingRepository.createInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ servicePriceSnapshot: 8000 })
    );
    expect(sendBookingConfirmation).toHaveBeenCalledOnce();
    expect(sendBarberNotification).toHaveBeenCalledOnce();
    expect(sendBarberNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: "Juan Pérez",
        clientPhone: "+56911111111",
        clientEmail: "juan@example.com",
        serviceName: "Corte",
        date: "2026-09-01",
        horaInicio: "10:00",
      })
    );
  });

  it("still returns success when the confirmation email fails to send", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceForBooking).mockResolvedValue({ durationMinutes: 30, price: 8000, name: "Corte" });
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockResolvedValue({
      id: "new-2", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);
    vi.mocked(sendBookingConfirmation).mockRejectedValue(new Error("Resend down"));

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("new-2");
  });

  it("still notifies the barber when the client confirmation email fails to send (independent sends)", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceForBooking).mockResolvedValue({ durationMinutes: 30, price: 8000, name: "Corte" });
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockResolvedValue({
      id: "new-3", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);
    vi.mocked(sendBookingConfirmation).mockRejectedValue(new Error("Resend down"));

    await bookingService.createAppointment(baseInput);

    expect(sendBarberNotification).toHaveBeenCalledOnce();
  });

  it("still returns success when the barber notification email fails to send", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceForBooking).mockResolvedValue({ durationMinutes: 30, price: 8000, name: "Corte" });
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockResolvedValue({
      id: "new-4", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30", clientName: "Juan Pérez",
    } as never);
    vi.mocked(sendBarberNotification).mockRejectedValue(new Error("Resend down"));

    const result = await bookingService.createAppointment(baseInput);

    expect(result.id).toBe("new-4");
    expect(sendBookingConfirmation).toHaveBeenCalledOnce();
  });

  it("surfaces the DB unique-constraint violation as the same 'slot not available' error (race condition caught at the DB layer)", async () => {
    vi.mocked(bookingRepository.findByIdempotencyKey).mockResolvedValue(null);
    vi.mocked(bookingRepository.getServiceForBooking).mockResolvedValue({ durationMinutes: 30, price: 8000, name: "Corte" });
    vi.mocked(availabilityService.getFreeSlotsForDate).mockResolvedValue(["10:00"]);
    vi.mocked(bookingRepository.createInTransaction).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    await expect(bookingService.createAppointment(baseInput)).rejects.toThrow(/no está disponible/i);
  });
});

describe("bookingService.getAppointmentByCancelToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for an unknown token instead of throwing", async () => {
    vi.mocked(bookingRepository.findByCancelToken).mockResolvedValue(null);

    const result = await bookingService.getAppointmentByCancelToken("bad-token");

    expect(result).toBeNull();
  });

  it("returns the appointment summary for a valid token", async () => {
    vi.mocked(bookingRepository.findByCancelToken).mockResolvedValue({
      id: "appt-1", date: "2026-09-01", horaInicio: "10:00", horaFin: "10:30",
      clientName: "Juan Pérez", clientPhone: "+56911111111", clientEmail: "juan@example.com",
      status: "confirmed", servicePriceSnapshot: 8000, service: { name: "Corte" },
    } as never);

    const result = await bookingService.getAppointmentByCancelToken("good-token");

    expect(result).toEqual(expect.objectContaining({ id: "appt-1", serviceName: "Corte", status: "confirmed" }));
  });
});

describe("bookingService.cancelAppointmentByToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws for an unknown token", async () => {
    vi.mocked(bookingRepository.findByCancelToken).mockResolvedValue(null);

    await expect(bookingService.cancelAppointmentByToken("bad-token")).rejects.toThrow(/no encontramos/i);
    expect(bookingRepository.cancel).not.toHaveBeenCalled();
  });

  it("cancels the matching appointment by its id", async () => {
    vi.mocked(bookingRepository.findByCancelToken).mockResolvedValue({
      id: "appt-1", status: "confirmed",
    } as never);

    await bookingService.cancelAppointmentByToken("good-token");

    expect(bookingRepository.cancel).toHaveBeenCalledWith("appt-1");
  });

  it("is a no-op when the appointment was already cancelled", async () => {
    vi.mocked(bookingRepository.findByCancelToken).mockResolvedValue({
      id: "appt-1", status: "cancelled",
    } as never);

    await bookingService.cancelAppointmentByToken("good-token");

    expect(bookingRepository.cancel).not.toHaveBeenCalled();
  });
});
