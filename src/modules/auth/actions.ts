"use server";

import { redirect } from "next/navigation";
import { verifyPassword, createSessionCookie, clearSessionCookie } from "./session";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const valid = await verifyPassword(password);
  if (!valid) {
    return { error: "Contraseña incorrecta" };
  }
  await createSessionCookie();
  redirect("/admin/reservas");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}
