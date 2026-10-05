"use client";

import { useState, type CSSProperties } from "react";
import { WizardButton } from "./WizardButton";
import { daysInMonth, firstWeekdayOfMonth, toDateStr } from "@/lib/calendar";
import { monthKeyOf } from "./domain/wizardFormat";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Sunday-first (0-6) -> Monday-first (0-6) column index, to match the
 * imported design's L M X J V S D header. */
function mondayFirstIndex(sundayFirstIndex: number): number {
  return (sundayFirstIndex + 6) % 7;
}

interface Cell {
  dateStr: string;
  day: number;
}

/** Step 2 — month calendar grid. `freeDays` (from the real availability
 * Server Action) drives which cells are selectable; everything else
 * (today ring, selected gradient, disabled dimming) is pixel-matched to
 * the imported design's per-cell style logic. */
export function DayStep({
  freeDays,
  selectedDate,
  onSelect,
  onBack,
  onContinue,
}: {
  freeDays: string[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const freeDaySet = new Set(freeDays);
  const freeMonthKeys = new Set(freeDays.map(monthKeyOf));

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    else if (m < 1) { m = 12; y--; }
    setYear(y);
    setMonth(m);
  }

  const canPrevMonth = monthKeyOf(toDateStr(year, month, 1)) > monthKeyOf(todayStr);
  const nextMonthKey = month === 12 ? `${year + 1}-01` : `${year}-${(month + 1).toString().padStart(2, "0")}`;
  const canNextMonth = [...freeMonthKeys].some((k) => k >= nextMonthKey);

  const totalDays = daysInMonth(year, month);
  const leadingBlanks = mondayFirstIndex(firstWeekdayOfMonth(year, month));
  const cells: (Cell | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => ({ dateStr: toDateStr(year, month, i + 1), day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ animation: "stepIn 420ms cubic-bezier(.16,1,.3,1)" }}>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(245,247,246,0.4)]">
        2 · Elige el día
      </div>

      <div className="mb-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canPrevMonth}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.05] text-[15px] disabled:opacity-20"
          style={{ color: canPrevMonth ? "#f5f7f6" : "rgba(245,247,246,0.2)" }}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="text-sm font-extrabold capitalize text-[#f5f7f6]">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canNextMonth}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.05] text-[15px] disabled:opacity-20"
          style={{ color: canNextMonth ? "#f5f7f6" : "rgba(245,247,246,0.2)" }}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="text-center text-[11px] font-bold text-[rgba(245,247,246,0.35)]">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const isFree = freeDaySet.has(cell.dateStr);
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === todayStr;

          let style: CSSProperties;
          if (isSelected) {
            style = {
              backgroundImage: "linear-gradient(160deg, var(--accent-100), var(--accent-500))",
              color: "#0b0f0d",
              border: "2px solid var(--accent-500)",
              fontWeight: 800,
              boxShadow: "0 0 18px rgba(var(--accent-rgb),0.44)",
              animation: "selectPulse 1.8s ease-in-out infinite",
            };
          } else if (!isFree) {
            style = { background: "transparent", color: "rgba(245,247,246,0.2)", border: "1px solid transparent", fontWeight: 600 };
          } else if (isToday) {
            style = { background: "rgba(255,255,255,0.05)", color: "#f5f7f6", border: "1px solid rgba(var(--accent-rgb),0.5)", fontWeight: 700 };
          } else {
            style = { background: "rgba(255,255,255,0.04)", color: "rgba(245,247,246,0.85)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 600 };
          }

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={!isFree}
              onClick={() => onSelect(cell.dateStr)}
              className="aspect-square rounded-[10px] text-[13px] transition-transform enabled:hover:scale-[1.06]"
              style={{ ...style, cursor: isFree ? "pointer" : "not-allowed" }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-[18px] flex gap-2.5">
        <WizardButton type="button" variant="back" onClick={onBack}>
          Atrás
        </WizardButton>
        <WizardButton type="button" onClick={onContinue} disabled={!selectedDate}>
          Continuar
        </WizardButton>
      </div>
    </div>
  );
}
