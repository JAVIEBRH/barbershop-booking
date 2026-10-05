export function GlassStat({
  label,
  value,
  accent = "accent",
}: {
  label: string;
  value: string;
  accent?: "accent" | "danger" | "success";
}) {
  return (
    <div className="glass-surface relative overflow-hidden p-6">
      <div
        className="ambient-orb -right-10 -top-10 h-32 w-32"
        style={{
          background: `radial-gradient(circle, var(--${accent}-100, var(--${accent}-500)) 0%, transparent 70%)`,
          opacity: 0.35,
        }}
      />
      <p className="font-display relative text-xs font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="font-display relative mt-2 text-4xl font-extrabold text-[var(--foreground)] md:text-5xl">
        {value}
      </p>
    </div>
  );
}
