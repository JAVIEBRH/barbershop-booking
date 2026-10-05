import { WizardButton } from "./WizardButton";
import { addMinutes, formatDateLong } from "./domain/wizardFormat";

/** Step 3 — time slot list. `slots` are already-free start times from the
 * real availability Server Action, so unlike the imported design's fake
 * hash-based "Ocupado" demo state, every row here is genuinely bookable —
 * the only states are "Disponible" and "Elegido". Only the start time fits
 * in each compact grid cell, so the block's actual length is called out
 * once above the grid instead — otherwise nothing here tells the client
 * how long their slot runs until the confirm step, two steps later. */
export function TimeStep({
  date,
  slots,
  durationMinutes,
  selectedSlot,
  onSelect,
  onBack,
  onContinue,
}: {
  date: string;
  slots: string[];
  durationMinutes: number;
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div style={{ animation: "stepIn 420ms cubic-bezier(.16,1,.3,1)" }}>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(245,247,246,0.4)]">
        3 · Elige la hora
      </div>
      <div className="mb-1 text-[15px] font-extrabold capitalize text-[#f5f7f6]">{formatDateLong(date)}</div>
      <div className="mb-3.5 text-[13px] text-[rgba(245,247,246,0.55)]">
        Cada hora reserva un bloque de {durationMinutes} min
        {selectedSlot && (
          <>
            {" "}— <span className="font-bold text-[var(--accent-100)]">{selectedSlot} a {addMinutes(selectedSlot, durationMinutes)}</span>
          </>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm font-medium text-[rgba(245,247,246,0.55)]">No hay horas libres ese día.</p>
      ) : (
        <div className="grid max-h-[45vh] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {slots.map((slot) => {
            const selected = slot === selectedSlot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onSelect(slot)}
                className="flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2.5 transition-transform hover:scale-[1.04]"
                style={
                  selected
                    ? {
                        backgroundImage: "linear-gradient(160deg, var(--accent-100), var(--accent-500))",
                        border: "2px solid var(--accent-500)",
                        boxShadow: "0 0 18px rgba(var(--accent-rgb),0.38)",
                        animation: "selectPulse 1.8s ease-in-out infinite",
                      }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                <span className="text-sm font-bold" style={{ color: selected ? "#0b0f0d" : "#f5f7f6" }}>
                  {slot}
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: selected ? "#0b0f0d" : "rgba(245,247,246,0.4)" }}
                >
                  {selected ? "Elegido" : "Disponible"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-[18px] flex gap-2.5">
        <WizardButton type="button" variant="back" onClick={onBack}>
          Atrás
        </WizardButton>
        <WizardButton type="button" onClick={onContinue} disabled={!selectedSlot}>
          Continuar
        </WizardButton>
      </div>
    </div>
  );
}
