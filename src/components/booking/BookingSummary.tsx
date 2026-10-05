interface SummaryRow {
  label: string;
  value: string;
  strong?: boolean;
  dividerBefore?: boolean;
}

/** Dashed-border summary card — used identically on the confirm step and
 * the success step in the imported design. */
export function BookingSummary({ rows }: { rows: SummaryRow[] }) {
  return (
    <div
      className="mb-[18px] flex flex-col gap-2.5 rounded-2xl px-[18px] py-4 text-left"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.22)" }}
    >
      {rows.map((row) => (
        <div key={row.label}>
          {row.dividerBefore && <div className="mb-2.5 mt-0.5 h-px bg-white/[0.12]" />}
          <div className="flex justify-between">
            <span className="text-[13px] text-[rgba(245,247,246,0.55)]">{row.label}</span>
            <span
              className="text-right font-bold text-[#f5f7f6]"
              style={row.strong ? { fontSize: "16px", color: "var(--accent-100)" } : { fontSize: "13px" }}
            >
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
