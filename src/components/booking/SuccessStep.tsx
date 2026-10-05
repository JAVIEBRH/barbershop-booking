import { WizardButton } from "./WizardButton";
import { BookingSummary } from "./BookingSummary";
import { formatDateLong } from "./domain/wizardFormat";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

/** Step 5 — success screen with the animated checkmark (SVG stroke-dash
 * draw-in + circle pop-in) from the imported design, exactly reproduced. */
export function SuccessStep({
  serviceName,
  clientName,
  date,
  horaInicio,
  price,
  cancelToken,
  onEdit,
  onReset,
}: {
  serviceName: string;
  clientName: string;
  date: string;
  horaInicio: string;
  price: number;
  cancelToken: string;
  onEdit: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center px-1 py-3 text-center"
      style={{ animation: "stepIn 420ms cubic-bezier(.16,1,.3,1)" }}
    >
      <div
        className="mb-[18px] flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundImage: "linear-gradient(160deg, var(--accent-100), var(--accent-500))", animation: "popIn 420ms ease" }}
      >
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path
            d="M6 15.5L12 21L24 8"
            stroke="#0b0f0d"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="48"
            style={{ animation: "checkDraw 500ms 200ms ease forwards", strokeDashoffset: 48 }}
          />
        </svg>
      </div>
      <h2 className="font-display mb-2 text-[26px] font-extrabold text-[#f5f7f6]">¡Reserva confirmada!</h2>
      <p className="mb-5 text-sm text-[rgba(245,247,246,0.55)]">
        {formatDateLong(date)} a las {horaInicio}
      </p>

      <div className="w-full">
        <BookingSummary
          rows={[
            { label: "Servicio", value: serviceName },
            { label: "Cliente", value: clientName },
            { label: "Total", value: formatCLP(price), strong: true },
          ]}
        />
      </div>

      <p className="mb-5 text-xs text-[rgba(245,247,246,0.5)]">
        Te enviamos la confirmación a tu correo.{" "}
        <a href={`/reservas/cancelar/${cancelToken}`} className="underline" style={{ color: "var(--accent-100)" }}>
          ¿Necesitas cancelar?
        </a>
      </p>

      <div className="flex w-full gap-2.5">
        <WizardButton type="button" variant="back" widthPx={120} onClick={onEdit} className="!text-[13px]">
          Corregir datos
        </WizardButton>
        <WizardButton type="button" onClick={onReset}>
          Hacer otra reserva
        </WizardButton>
      </div>
    </div>
  );
}
