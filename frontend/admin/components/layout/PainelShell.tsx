"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { IconeMenu, IconeFechar } from "@/components/ui/icons";

/**
 * Casca do painel: em desktop (lg+) a Sidebar fica fixa à esquerda; em mobile
 * ela vira um drawer (gaveta) aberto por um botão hambúrguer numa topbar.
 */
export function PainelShell({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao navegar entre páginas.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Trava o scroll do body enquanto o drawer estiver aberto (mobile).
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <div className="flex min-h-screen bg-panel-bg">
      {/* ---- Sidebar desktop (fixa) ---- */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* ---- Drawer mobile ---- */}
      {/* Backdrop */}
      <div
        onClick={() => setAberto(false)}
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />
      {/* Painel deslizante */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <Sidebar />
      </div>

      {/* ---- Conteúdo ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar só no mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-panel-border bg-panel-surface px-4 lg:hidden">
          <button
            onClick={() => setAberto((v) => !v)}
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={aberto}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-panel-ink transition hover:bg-panel-surfaceMuted"
          >
            {aberto ? (
              <IconeFechar className="h-6 w-6" />
            ) : (
              <IconeMenu className="h-6 w-6" />
            )}
          </button>
          <span className="font-semibold text-panel-ink">Painel</span>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
