import { BookingWizard } from "@/components/booking/BookingWizard";
import { listActiveServicesAction } from "@/modules/services-catalog/actions";

// Must always reflect the barber's current service list and availability —
// Next.js would otherwise statically prerender this page at build time and
// bake in whatever data existed then, going stale after every admin change.
export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const services = await listActiveServicesAction();

  return <BookingWizard services={services} />;
}
