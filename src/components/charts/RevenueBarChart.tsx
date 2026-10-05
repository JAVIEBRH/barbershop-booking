import { formatCLP } from "@/lib/money";
import type { MonthlyRevenue } from "@/modules/revenue/types";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function monthLabel(month: string): string {
  const m = Number(month.split("-")[1]);
  return MONTH_LABELS[m - 1];
}

/** 3D glassmorphism bar chart — gradient body (3 stops), specular highlight
 * on the top face, drop shadow, value pill above each bar, last period
 * highlighted in gold. */
export function RevenueBarChart({ data }: { data: MonthlyRevenue[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--foreground-muted)]">Aún no hay ingresos registrados.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const barWidth = 56;
  const gap = 30;
  const chartHeight = 170;
  const topMargin = 36;
  const bottomMargin = 34;
  const width = data.length * (barWidth + gap) + gap;
  const height = topMargin + chartHeight + bottomMargin;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="mx-auto block" role="img" aria-label="Ingresos mensuales">
        <defs>
          <linearGradient id="revBarMuted" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#8a93ad" />
            <stop offset="55%" stopColor="#556080" />
            <stop offset="100%" stopColor="#333d58" />
          </linearGradient>
          <linearGradient id="revBarAccent" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#f2cd8f" />
            <stop offset="55%" stopColor="#d9a34a" />
            <stop offset="100%" stopColor="#b9772e" />
          </linearGradient>
          <linearGradient id="revBarSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="revBarShadow" x="-60%" y="-20%" width="220%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0b1220" floodOpacity="0.35" />
          </filter>
        </defs>

        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const barHeight = Math.max((d.total / max) * chartHeight, 6);
          const x = gap + i * (barWidth + gap);
          const y = topMargin + (chartHeight - barHeight);
          const gradId = isLast ? "revBarAccent" : "revBarMuted";

          return (
            <g key={d.month} filter="url(#revBarShadow)">
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={14} fill={`url(#${gradId})`} />
              <rect x={x} y={y} width={barWidth} height={Math.min(barHeight, barHeight * 0.55)} rx={14} fill="url(#revBarSheen)" />
              <text
                x={x + barWidth / 2}
                y={y - 12}
                textAnchor="middle"
                fontFamily="var(--font-big-shoulders), sans-serif"
                fontWeight={800}
                fontSize="12.5"
                style={{ fill: isLast ? "var(--accent-900)" : "var(--foreground-strong)" }}
              >
                {formatCLP(d.total)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontFamily="var(--font-manrope), sans-serif"
                fontWeight={isLast ? 800 : 700}
                fontSize="13"
                style={{ fill: isLast ? "var(--accent-900)" : "var(--foreground-muted)" }}
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
