import { redirect } from "next/navigation";
import { hasValidSession } from "./session";

/** Call at the top of any admin Server Action or Server Component. Redirects unauthenticated requests to the login page. */
export async function requireAdminSession(): Promise<void> {
  const ok = await hasValidSession();
  if (!ok) {
    redirect("/admin/login");
  }
}
