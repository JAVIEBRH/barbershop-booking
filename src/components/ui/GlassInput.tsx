import { type InputHTMLAttributes } from "react";

export function GlassInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`glass-surface !rounded-2xl px-4 py-3 text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none transition-shadow duration-200 focus:shadow-[0_14px_30px_rgba(63,111,203,0.25)] ${className}`}
      {...props}
    />
  );
}
