"use client";

import { useState } from "react";
import { WizardButton } from "./WizardButton";
import { BookingSummary } from "./BookingSummary";
import { addMinutes, formatDateLong } from "./domain/wizardFormat";

export interface ConfirmValues {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function isValid(v: ConfirmValues): boolean {
  return v.clientName.trim().length > 1 && v.clientPhone.trim().length > 5 && /\S+@\S+\.\S+/.test(v.clientEmail);
}

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#f5f7f6",
};

/** Step 4 — dashed summary + client details form, pixel-matched to the
 * imported design (labeled fields above translucent inputs, dashed summary
 * card with a divider only before the Total row). */
export function ConfirmStep({
  serviceName,
  date,
  slot,
  durationMinutes,
  price,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  serviceName: string;
  date: string;
  slot: string;
  durationMinutes: number;
  price: number;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (values: ConfirmValues) => void;
}) {
  const [values, setValues] = useState<ConfirmValues>({ clientName: "", clientPhone: "", clientEmail: "" });
  const valid = isValid(values);

  return (
    <div style={{ animation: "stepIn 420ms cubic-bezier(.16,1,.3,1)" }}>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(245,247,246,0.4)]">
        4 · Confirma tu reserva
      </div>

      <BookingSummary
        rows={[
          { label: "Servicio", value: serviceName },
          { label: "Fecha", value: formatDateLong(date) },
          { label: "Hora", value: `${slot} – ${addMinutes(slot, durationMinutes)}` },
          { label: "Total", value: formatCLP(price), strong: true, dividerBefore: true },
        ]}
      />

      <form
        className="mb-[18px] flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(values);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[rgba(245,247,246,0.5)]">Nombre</label>
          <input
            type="text"
            placeholder="Tu nombre"
            required
            value={values.clientName}
            onChange={(e) => setValues({ ...values, clientName: e.target.value })}
            className="rounded-xl px-3.5 py-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[rgba(245,247,246,0.5)]">WhatsApp</label>
          <input
            type="tel"
            placeholder="+56 9 1234 5678"
            required
            value={values.clientPhone}
            onChange={(e) => setValues({ ...values, clientPhone: e.target.value })}
            className="rounded-xl px-3.5 py-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-[rgba(245,247,246,0.5)]">Email</label>
          <input
            type="email"
            placeholder="tucorreo@mail.com"
            required
            value={values.clientEmail}
            onChange={(e) => setValues({ ...values, clientEmail: e.target.value })}
            className="rounded-xl px-3.5 py-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </form>

      {error && (
        <p className="mb-3 text-sm font-semibold" style={{ color: "var(--danger-900)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2.5">
        <WizardButton type="button" variant="back" onClick={onBack}>
          Atrás
        </WizardButton>
        <WizardButton
          type="button"
          disabled={!valid || submitting}
          onClick={() => valid && onSubmit(values)}
        >
          {submitting ? "Reservando..." : "Confirmar reserva"}
        </WizardButton>
      </div>
    </div>
  );
}
