import { type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { hasValidSession } from "@/modules/auth/session";
import { logoutAction } from "@/modules/auth/actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await hasValidSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {authed && (
        <nav className="font-display mb-6 flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
          <div className="flex items-center gap-3">
            <Logo size={44} idPrefix="admin-nav-logo" />
            <div className="flex gap-4">
              <Link href="/admin/disponibilidad" className="hover:text-[var(--accent-900)]">Disponibilidad</Link>
              <Link href="/admin/reservas" className="hover:text-[var(--accent-900)]">Reservas</Link>
              <Link href="/admin/servicios" className="hover:text-[var(--accent-900)]">Servicios</Link>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-[var(--danger-900)] underline">Salir</button>
          </form>
        </nav>
      )}
      {children}
    </div>
  );
}
