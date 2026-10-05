import { STEP_ORDER, STEP_LABELS, type StepId } from "./domain/wizardSteps";

const VISIBLE_STEPS = STEP_ORDER.filter((s) => s !== "success");

/** 4-circle step tracker with a connecting progress line — pixel-matched to
 * the imported design: done steps show a checkmark on a solid dark-gold
 * circle, the current step glows with the light->dark gold gradient, and
 * upcoming steps sit dim on translucent white. A completed step's circle
 * and label are clickable to jump straight back to it (only completed
 * ones — the current step is a no-op and future steps have nothing
 * selected yet to jump to). */
export function StepProgress({
  current,
  onSelectStep,
}: {
  current: StepId;
  onSelectStep?: (step: StepId) => void;
}) {
  const currentIndex = VISIBLE_STEPS.indexOf(current as (typeof VISIBLE_STEPS)[number]);
  // "success" (after confirm) renders every step as done.
  const isSuccess = current === "success";
  const progressPct = isSuccess ? 100 : Math.round((Math.max(currentIndex, 0) / (VISIBLE_STEPS.length - 1)) * 100);

  return (
    <div className="relative px-2.5 pb-3 pt-1">
      <div className="absolute left-[38px] right-[38px] top-5 h-0.5 rounded-full bg-white/[0.12]" />
      <div
        className="absolute left-[38px] top-5 h-0.5 rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${progressPct}%`, background: "var(--accent-500)" }}
      />
      <div className="relative flex justify-between pb-1">
        {VISIBLE_STEPS.map((step, i) => {
          const n = i + 1;
          const isDone = isSuccess || currentIndex > i;
          const isCurrent = !isSuccess && currentIndex === i;
          const clickable = isDone && !isSuccess && !!onSelectStep;
          return (
            <button
              key={step}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectStep?.(step)}
              className={`flex w-16 flex-col items-center gap-1.5 bg-transparent ${clickable ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"} transition-transform duration-150`}
              aria-label={clickable ? `Volver a ${STEP_LABELS[step]}` : undefined}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition-all duration-200"
                style={{
                  fontWeight: isCurrent ? 800 : 700,
                  backgroundImage: isCurrent
                    ? "linear-gradient(160deg, var(--accent-100), var(--accent-900))"
                    : undefined,
                  background: !isCurrent ? (isDone ? "var(--accent-900)" : "rgba(255,255,255,0.07)") : undefined,
                  color: isCurrent || isDone ? "#0b0f0d" : "rgba(245,247,246,0.4)",
                  border: isCurrent
                    ? "2px solid var(--accent-100)"
                    : isDone
                      ? "1px solid rgba(var(--accent-rgb),0.5)"
                      : "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {isDone ? "✓" : n}
              </div>
              <span
                className="text-center text-[10px] font-bold uppercase tracking-wide"
                style={{ color: isCurrent ? "#f5f7f6" : isDone ? "rgba(245,247,246,0.75)" : "rgba(245,247,246,0.35)" }}
              >
                {STEP_LABELS[step]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
