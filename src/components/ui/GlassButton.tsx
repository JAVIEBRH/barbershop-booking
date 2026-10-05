import { type ButtonHTMLAttributes } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "solid" = filled gold gradient CTA. "glass" = translucent selectable chip (default). */
  variant?: "solid" | "glass";
  selected?: boolean;
}

export function GlassButton({ className = "", variant = "glass", selected = false, ...props }: GlassButtonProps) {
  const base =
    "font-display px-5 py-3 text-sm font-bold transition-all duration-200 ease-out active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-2xl";

  const solid =
    "text-[#1a1206] shadow-[0_10px_24px_rgba(185,119,46,0.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(185,119,46,0.45)]";
  const solidBg = { backgroundImage: "linear-gradient(150deg, var(--accent-100), var(--accent-900))" };

  const glass = `glass-surface !rounded-2xl hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)] ${
    selected ? "ring-2 ring-[var(--accent-500)]" : ""
  }`;

  if (variant === "solid") {
    return <button className={`${base} ${solid} ${className}`} style={solidBg} {...props} />;
  }
  return (
    <button className={`${base} ${glass} text-[var(--foreground)] ${className}`} {...props} />
  );
}
