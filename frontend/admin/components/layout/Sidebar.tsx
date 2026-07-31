"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { PAPEL_LABEL } from "@/lib/format";
import type { PapelInterno } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  papeis?: PapelInterno[]; // undefined = todos os internos
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", papeis: ["admin", "financeiro", "atendimento"] },
  { href: "/produtos", label: "Produtos", papeis: ["admin", "estoque"] },
  { href: "/estoque", label: "Estoque", papeis: ["admin", "estoque"] },
  { href: "/pedidos", label: "Pedidos", papeis: ["admin", "atendimento"] },
  { href: "/avaliacoes", label: "Avaliações", papeis: ["admin", "atendimento"] },
  { href: "/cupons", label: "Cupons", papeis: ["admin", "atendimento"] },
  { href: "/fornecedores", label: "Fornecedores", papeis: ["admin", "estoque", "financeiro"] },
  { href: "/compras", label: "Compras & Financeiro", papeis: ["admin", "estoque", "financeiro"] },
  { href: "/margem", label: "Margem", papeis: ["admin", "financeiro"] },
  { href: "/personalizacao", label: "Personalização", papeis: ["admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, sair, temPapel } = useAuth();

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col bg-panel-sidebar text-slate-300">
      <div className="px-6 py-6">
        <Link href="/dashboard" className="text-lg font-bold text-white">
          Samara <span className="text-panel-accent">Beach</span>
        </Link>
        <p className="mt-1 text-xs text-slate-400">Painel interno</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((item) => !item.papeis || temPapel(item.papeis)).map(
          (item) => {
            const ativo = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  ativo
                    ? "bg-panel-accent text-white"
                    : "hover:bg-panel-sidebarHover"
                }`}
              >
                {item.label}
              </Link>
            );
          },
        )}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4 text-xs">
        {usuario && (
          <>
            <p className="truncate text-slate-200">{usuario.email}</p>
            <p className="text-slate-400">
              {usuario.papel ? PAPEL_LABEL[usuario.papel] : "—"}
            </p>
            <button
              onClick={() => sair()}
              className="mt-2 text-slate-400 hover:text-white"
            >
              Sair
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
