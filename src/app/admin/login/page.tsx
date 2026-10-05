"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { loginAction } from "@/modules/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <GlassCard className="mx-auto max-w-sm">
      <div className="mb-4 flex justify-center">
        <Logo size={96} idPrefix="login-logo" />
      </div>
      <h1 className="font-display mb-4 text-xl font-extrabold text-center">Acceso barbero</h1>
      <form
        action={async (formData) => {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        }}
        className="flex flex-col gap-3"
      >
        <GlassInput type="password" name="password" placeholder="Contraseña" required className="w-full" />
        <GlassButton type="submit" variant="solid">Entrar</GlassButton>
      </form>
      {error && <p className="mt-2 text-sm font-semibold text-[var(--danger-900)]">{error}</p>}
    </GlassCard>
  );
}
