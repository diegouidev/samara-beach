"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import type { PapelInterno } from "@/lib/types";

/**
 * Protege as páginas do painel: exige usuário interno logado.
 * Se `papeis` for passado, exige um desses papéis (admin sempre passa).
 */
export function RequireAuth({
  children,
  papeis,
}: {
  children: React.ReactNode;
  papeis?: PapelInterno[];
}) {
  const { usuario, carregando, temPapel } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !usuario) {
      router.replace("/login");
    }
  }, [carregando, usuario, router]);

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!usuario) return null;

  if (papeis && !temPapel(papeis)) {
    return (
      <div className="rounded-xl border border-panel-border bg-white p-12 text-center">
        <p className="font-medium text-panel-ink">Acesso negado</p>
        <p className="mt-1 text-sm text-slate-500">
          Seu papel não tem permissão para esta seção.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
