"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Logo } from "@/components/Logo";
import { StepProgress } from "./StepProgress";
import { ServiceStep } from "./ServiceStep";
import { DayStep } from "./DayStep";
import { TimeStep } from "./TimeStep";
import { ConfirmStep, type ConfirmValues } from "./ConfirmStep";
import { SuccessStep } from "./SuccessStep";
import { getFreeDaysAction, getFreeSlotsAction } from "@/modules/availability/actions";
import { createAppointmentAction } from "@/modules/booking/actions";
import { canAdvance, nextStep, prevStep, type StepId, type WizardSelections } from "./domain/wizardSteps";
import type { ServiceItem } from "@/modules/services-catalog/types";

const BOOKING_WINDOW_DAYS = 45;

/** Full-page booking wizard — outer shell (radial gold glow + 3 floating
 * blurred blobs over a near-black gradient), badge + title, step tracker,
 * and a glass card holding the current step. Pixel-matched to the imported
 * "booking design mockup" design; every value inside the card
 * comes from real Server Actions, not the design's demo hash() logic. */
export function BookingWizard({ services }: { services: ServiceItem[] }) {
  const [step, setStep] = useState<StepId>("service");
  const [serviceId, setServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [freeDays, setFreeDays] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ date: string; horaInicio: string; clientName: string; cancelToken: string } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());

  const selections: WizardSelections = { serviceId, date, slot };
  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  async function goNext() {
    if (!canAdvance(step, selections)) return;

    if (step === "service" && selectedService) {
      const days = await getFreeDaysAction(BOOKING_WINDOW_DAYS, selectedService.durationMinutes);
      setFreeDays(days);
    }
    if (step === "day" && date && selectedService) {
      const freeSlots = await getFreeSlotsAction(date, selectedService.durationMinutes);
      setSlots(freeSlots);
    }

    const next = nextStep(step);
    if (next) setStep(next);
  }

  function goBack() {
    const prev = prevStep(step);
    if (prev) setStep(prev);
  }

  async function handleSubmit(values: ConfirmValues) {
    if (!date || !slot || !selectedService) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createAppointmentAction({
        date,
        horaInicio: slot,
        serviceId: selectedService.id,
        idempotencyKey,
        ...values,
      });
      setConfirmed({ date: result.date, horaInicio: result.horaInicio, clientName: result.clientName, cancelToken: result.cancelToken });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la reserva");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setStep("service");
    setDate(null);
    setSlot(null);
    setConfirmed(null);
    setError(null);
    setIdempotencyKey(uuidv4());
  }

  return (
    <div
      className="relative flex min-h-screen w-full justify-center overflow-hidden px-4 py-10"
      style={{ background: "var(--background)", fontFamily: "var(--font-manrope), sans-serif" }}
    >
      <div
        className="pointer-events-none absolute -left-[60px] -top-[80px] h-[280px] w-[280px] rounded-full"
        style={{ background: "var(--accent-500)", filter: "blur(80px)", opacity: 0.28, mixBlendMode: "screen", animation: "floatBlob 9s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -right-[90px] top-[20%] h-[320px] w-[320px] rounded-full"
        style={{ background: "#7c5cff", filter: "blur(90px)", opacity: 0.22, mixBlendMode: "screen", animation: "floatBlob2 11s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -bottom-[100px] left-[20%] h-[260px] w-[260px] rounded-full"
        style={{ background: "#34d1c9", filter: "blur(85px)", opacity: 0.18, mixBlendMode: "screen", animation: "floatBlob 13s ease-in-out infinite reverse" }}
      />

      <div className="relative z-10 flex w-full max-w-[460px] flex-col gap-5">
        <div className="relative px-3 pb-1 pt-2 text-center">
          <div
            className="pointer-events-none absolute left-1/2 top-[38px] h-[70px] w-[220px] -translate-x-1/2 -translate-y-1/2"
            style={{ background: "var(--accent-500)", filter: "blur(46px)", opacity: 0.45, animation: "titlePulse 3.4s ease-in-out infinite" }}
          />
          <div className="relative mb-2 flex justify-center">
            <Logo size={128} idPrefix="wizard-logo" />
          </div>
          <span
            className="relative mb-3.5 inline-block rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              background: "rgba(var(--accent-rgb),0.12)",
              border: "1px solid rgba(var(--accent-rgb),0.35)",
              color: "var(--accent-100)",
              animation: "glowPulseCurrent 2.6s ease-in-out infinite",
            }}
          >
            Reserva online
          </span>
          <h1 className="font-display relative m-0 mb-2 text-[44px] font-extrabold leading-none tracking-[0.01em] text-[#f5f7f6]">
            Barber Studio
          </h1>
          <p className="relative m-0 text-[15px] text-[rgba(245,247,246,0.55)]">
            Elige tu corte, tu día y tu hora — reservado al tiro.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="glass-surface p-6 text-center">
            <p className="text-[var(--foreground-strong)]">Aún no hay servicios configurados. Vuelve pronto.</p>
          </div>
        ) : (
          <>
            <StepProgress current={step} onSelectStep={(target) => setStep(target)} />

            <div className="relative overflow-hidden rounded-[24px] p-[22px]" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)", backdropFilter: "blur(32px) saturate(160%)", WebkitBackdropFilter: "blur(32px) saturate(160%)" }}>
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }} />

              {step === "service" && (
                <ServiceStep services={services} selectedId={serviceId} onSelect={setServiceId} onContinue={goNext} />
              )}

              {step === "day" && (
                <DayStep freeDays={freeDays} selectedDate={date} onSelect={setDate} onBack={goBack} onContinue={goNext} />
              )}

              {step === "time" && date && selectedService && (
                <TimeStep
                  date={date}
                  slots={slots}
                  durationMinutes={selectedService.durationMinutes}
                  selectedSlot={slot}
                  onSelect={setSlot}
                  onBack={goBack}
                  onContinue={goNext}
                />
              )}

              {step === "confirm" && date && slot && selectedService && (
                <ConfirmStep
                  serviceName={selectedService.name}
                  date={date}
                  slot={slot}
                  durationMinutes={selectedService.durationMinutes}
                  price={selectedService.price}
                  submitting={submitting}
                  error={error}
                  onBack={goBack}
                  onSubmit={handleSubmit}
                />
              )}

              {step === "success" && confirmed && selectedService && (
                <SuccessStep
                  serviceName={selectedService.name}
                  clientName={confirmed.clientName}
                  date={confirmed.date}
                  horaInicio={confirmed.horaInicio}
                  price={selectedService.price}
                  cancelToken={confirmed.cancelToken}
                  onEdit={() => setStep("confirm")}
                  onReset={resetAll}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
