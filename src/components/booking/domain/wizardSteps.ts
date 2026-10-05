export type StepId = "service" | "day" | "time" | "confirm" | "success";

export const STEP_ORDER: StepId[] = ["service", "day", "time", "confirm", "success"];

export const STEP_LABELS: Record<StepId, string> = {
  service: "Servicio",
  day: "Día",
  time: "Hora",
  confirm: "Confirmar",
  success: "Listo",
};

export interface WizardSelections {
  serviceId: string | null;
  date: string | null;
  slot: string | null;
}

/** Whether the wizard may move past `step` given the current selections.
 * "confirm" and "success" have no gate here — form-field validity is
 * handled by the confirm form itself via native `required` inputs. */
export function canAdvance(step: StepId, sel: WizardSelections): boolean {
  switch (step) {
    case "service":
      return sel.serviceId !== null;
    case "day":
      return sel.date !== null;
    case "time":
      return sel.slot !== null;
    case "confirm":
    case "success":
      return true;
  }
}

export function nextStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return i >= 0 && i < STEP_ORDER.length - 1 ? STEP_ORDER[i + 1] : null;
}

export function prevStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return i > 0 ? STEP_ORDER[i - 1] : null;
}
