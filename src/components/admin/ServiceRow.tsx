"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { updateServiceAction } from "@/modules/services-catalog/actions";
import type { ServiceItem } from "@/modules/services-catalog/types";

/** One service in the admin list — labeled fields (the unlabeled bare
 * inputs were the "no está claro" complaint) plus a switch for active/
 * inactive, so deactivating a service never makes it silently vanish from
 * this list the way it used to (the admin action only ever fetched active
 * services) — it just dims and can be flipped back on. */
export function ServiceRow({ service }: { service: ServiceItem }) {
  const [active, setActive] = useState(service.active);
  const [name, setName] = useState(service.name);
  const [durationMinutes, setDurationMinutes] = useState(String(service.durationMinutes));
  const [price, setPrice] = useState(String(service.price));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleActive() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      await updateServiceAction(service.id, { active: next });
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateServiceAction(service.id, {
          name,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className={`glass-surface !rounded-xl p-4 transition-opacity ${active ? "" : "opacity-60"}`}>
      {/* Two grouped units (identity, fields) that each wrap as a whole and
          stack on mobile — a flat flex-wrap row let every individual field
          drop onto its own line on narrow screens. Same fix as WeeklyDayRow. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex items-center gap-3">
          <Switch checked={active} onClick={toggleActive} disabled={pending} ariaLabel={`${service.name} activo`} />
          {!active && (
            <span className="text-xs font-bold uppercase tracking-wide sm:hidden" style={{ color: "var(--danger-900)" }}>
              Inactivo
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 pl-[52px] sm:pl-0">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--foreground-muted)]">
            Nombre
            <GlassInput value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--foreground-muted)]">
            Duración (min)
            <GlassInput
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-24"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--foreground-muted)]">
            Precio (CLP)
            <GlassInput type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-28" />
          </label>
          <GlassButton type="button" variant="solid" disabled={pending} onClick={save}>
            Guardar
          </GlassButton>
          {saved && !pending && (
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--success-500)", animation: "popIn 320ms ease" }}>
              Guardado
            </span>
          )}
          {!active && (
            <span className="hidden text-xs font-bold uppercase tracking-wide sm:inline" style={{ color: "var(--danger-900)" }}>
              Inactivo — oculto en la reserva
            </span>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[var(--danger-900)]">{error}</p>}
    </div>
  );
}
