import { WizardButton } from "./WizardButton";
import type { ServiceItem } from "@/modules/services-catalog/types";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}

/** Step 1 — service picker. The imported design hardcodes a single
 * already-selected service card; this renders one such card per real
 * service, using the same visuals for the selected one and a dimmer
 * calendar-cell-style card (from the design's "unselected day" language)
 * for the rest. */
export function ServiceStep({
  services,
  selectedId,
  onSelect,
  onContinue,
}: {
  services: ServiceItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ animation: "stepIn 420ms cubic-bezier(.16,1,.3,1)" }}>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(245,247,246,0.4)]">
        1 · Elige tu servicio
      </div>
      <div className="flex flex-col gap-2.5">
        {services.map((s) => {
          const selected = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className="flex items-center justify-between gap-3 rounded-2xl p-[18px] text-left transition-transform hover:scale-[1.01]"
              style={
                selected
                  ? {
                      background: "linear-gradient(160deg, rgba(var(--accent-rgb),0.16), rgba(var(--accent-rgb),0.04))",
                      border: "2px solid var(--accent-500)",
                      boxShadow: "0 10px 26px rgba(var(--accent-rgb),0.33)",
                    }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              <div className="flex min-w-0 flex-col gap-2">
                <span className="text-[17px] font-extrabold leading-tight text-[#f5f7f6]">{s.name}</span>
                <span className="text-[13px] leading-tight text-[rgba(245,247,246,0.55)]">
                  {formatDuration(s.durationMinutes)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[19px] font-extrabold" style={{ color: "var(--accent-100)" }}>
                  {formatCLP(s.price)}
                </span>
                {selected && (
                  <span
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[13px] font-extrabold"
                    style={{ background: "var(--accent-500)", color: "#0b0f0d" }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-[18px] flex">
        <WizardButton type="button" onClick={onContinue} disabled={!selectedId}>
          Continuar
        </WizardButton>
      </div>
    </div>
  );
}
