import { requireAdminSession } from "@/modules/auth/guard";
import { listAllServicesAction } from "@/modules/services-catalog/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { ServiceRow } from "@/components/admin/ServiceRow";
import { AddServiceForm } from "@/components/admin/AddServiceForm";

export default async function ServiciosPage() {
  await requireAdminSession();
  const services = await listAllServicesAction();

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <h1 className="font-display mb-1 text-xl font-extrabold">Servicios</h1>
        <p className="mb-4 text-sm text-[var(--foreground-muted)]">
          El switch controla si el servicio aparece para que un cliente lo reserve — apagarlo
          no lo borra, solo lo oculta.
        </p>
        {services.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">Aún no tienes servicios — agrega el primero abajo.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((s) => (
              <ServiceRow key={s.id} service={s} />
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h2 className="font-display mb-3 text-lg font-extrabold">Agregar servicio</h2>
        <AddServiceForm />
      </GlassCard>
    </div>
  );
}
