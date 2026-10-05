import { redirect } from "next/navigation";

// The root domain is the barber's entry point, not the client's — the
// booking wizard lives at /reservas. requireAdminSession() inside
// /admin/reservas bounces unauthenticated visitors to /admin/login on its
// own, so this redirect works for both logged-in and logged-out cases.
export default function HomePage(): never {
  redirect("/admin/reservas");
}
