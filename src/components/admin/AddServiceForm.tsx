"use client";

import { useState, useTransition } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { createServiceAction } from "@/modules/services-catalog/actions";

const EMPTY = { name: "", durationMinutes: "", price: "" };

export function AddServiceForm() {
  const [values, setValues] = useState(EMPTY);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createServiceAction({
          name: values.name,
          durationMinutes: Number(values.durationMinutes),
          price: Number(values.price),
        });
        setValues(EMPTY);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo agregar el servicio");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--foreground-muted)]">
        Nombre
        <GlassInput
          placeholder="Ej. Corte de pelo"
          required
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          className="w-48"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--foreground-muted)]">
        Duración (min)
        <GlassInput
          type="number"
          min={1}
          placeholder="30"
          required
          value={values.durationMinutes}
          onChange={(e) => setValues({ ...values, durationMinutes: e.target.value })}
          className="w-24"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--foreground-muted)]">
        Precio (CLP)
        <GlassInput
          type="number"
          min={0}
          placeholder="10000"
          required
          value={values.price}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
          className="w-28"
        />
      </label>
      <GlassButton type="submit" variant="solid" disabled={pending}>
        Agregar servicio
      </GlassButton>
      {error && <p className="w-full text-sm font-semibold text-[var(--danger-900)]">{error}</p>}
    </form>
  );
}
