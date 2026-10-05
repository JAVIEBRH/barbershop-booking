"use client";

/** iOS-style on/off toggle — gold gradient track when on, translucent glass
 * track when off, sliding circle. Purely presentational/controlled; the
 * caller owns what "on" means and what happens on click. */
export function Switch({
  checked,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="relative h-7 w-12 shrink-0 rounded-full transition-all duration-200 ease-out disabled:opacity-50"
      style={
        checked
          ? { backgroundImage: "linear-gradient(150deg, var(--accent-100), var(--accent-900))" }
          : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }
      }
    >
      <span
        className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out"
        style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}
