import { type ButtonHTMLAttributes } from "react";

interface WizardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "primary" = full-width gold shine-sweep CTA. "back" = outlined ghost button. */
  variant?: "primary" | "back";
  /** Fixed width for the "back" variant — the imported design uses 100px
   * for a plain "Atrás", but the wider "Corregir datos" label needs 120px. */
  widthPx?: number;
}

/** Buttons matching "booking design mockup" exactly: primary CTA is
 * a gold gradient with a diagonal shine sweep and lifts on hover; back is a
 * subtle outlined ghost pinned to a fixed width. Disabled primary falls back
 * to a flat translucent fill with muted text, same as the imported design. */
export function WizardButton({ className = "", variant = "primary", widthPx = 100, disabled, ...props }: WizardButtonProps) {
  if (variant === "back") {
    return (
      <button
        disabled={disabled}
        className={`shrink-0 rounded-2xl border border-white/[0.16] bg-white/[0.04] px-2.5 py-[15px] text-sm font-bold text-[var(--foreground-strong)] transition-colors hover:bg-white/[0.08] disabled:opacity-40 ${className}`}
        style={{ width: `${widthPx}px` }}
        {...props}
      />
    );
  }

  return (
    <button
      disabled={disabled}
      className={`cta-shine flex-1 rounded-2xl px-5 py-[15px] text-[15px] font-extrabold transition-transform duration-150 ease-out active:scale-[0.97] enabled:hover:-translate-y-0.5 ${className}`}
      style={
        disabled
          ? { background: "rgba(255,255,255,0.06)", color: "rgba(245,247,246,0.3)", boxShadow: "none" }
          : {
              backgroundImage: "linear-gradient(160deg, var(--accent-100), var(--accent-900))",
              color: "#08120d",
              boxShadow: "0 10px 24px rgba(var(--accent-rgb),0.33), inset 0 1px 0 rgba(255,255,255,0.35)",
            }
      }
      {...props}
    />
  );
}
