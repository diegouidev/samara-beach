"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getBranding, type Branding } from "@/lib/branding";
import { PAPEL_LABEL, resolveImagem } from "@/lib/format";
import {
  IconeCaixa,
  IconeCategoria,
  IconeCliente,
  IconeCupom,
  IconeDevolucao,
  IconeEstoque,
  IconeEstrela,
  IconeFinanceiro,
  IconeFornecedor,
  IconeLink,
  IconeMargem,
  IconePDV,
  IconePainel,
  IconePaleta,
  IconePedido,
  IconePerfil,
  IconeProduto,
  IconeSair,
  IconeEmpresa,
} from "@/components/ui/icons";
import type { PapelInterno } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icone: ReactNode;
  papeis?: PapelInterno[]; // undefined = todos os internos
}

interface NavGrupo {
  titulo: string;
  itens: NavItem[];
}

const tamanhoIcone = "h-[18px] w-[18px]";

const NAV: NavGrupo[] = [
  {
    titulo: "Visão geral",
    itens: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icone: <IconePainel className={tamanhoIcone} />,
        papeis: ["admin", "financeiro", "atendimento"],
      },
      {
        href: "/relatorios",
        label: "Relatórios",
        icone: <IconeMargem className={tamanhoIcone} />,
        papeis: ["admin", "financeiro", "atendimento"],
      },
    ],
  },
  {
    titulo: "Catálogo",
    itens: [
      {
        href: "/produtos",
        label: "Produtos",
        icone: <IconeProduto className={tamanhoIcone} />,
        papeis: ["admin", "estoque"],
      },
      {
        href: "/categorias",
        label: "Categorias",
        icone: <IconeCategoria className={tamanhoIcone} />,
        papeis: ["admin", "estoque"],
      },
      {
        href: "/estoque",
        label: "Estoque",
        icone: <IconeEstoque className={tamanhoIcone} />,
        papeis: ["admin", "estoque"],
      },
    ],
  },
  {
    titulo: "Loja física",
    itens: [
      {
        href: "/pdv",
        label: "PDV — Venda",
        icone: <IconePDV className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
      {
        href: "/caixa",
        label: "Caixa",
        icone: <IconeCaixa className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
      {
        href: "/devolucoes",
        label: "Trocas e devoluções",
        icone: <IconeDevolucao className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
    ],
  },
  {
    titulo: "Vendas",
    itens: [
      {
        href: "/pedidos",
        label: "Pedidos",
        icone: <IconePedido className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
      {
        href: "/clientes",
        label: "Clientes",
        icone: <IconeCliente className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
      {
        href: "/cupons",
        label: "Cupons",
        icone: <IconeCupom className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
      {
        href: "/avaliacoes",
        label: "Avaliações",
        icone: <IconeEstrela className={tamanhoIcone} />,
        papeis: ["admin", "atendimento"],
      },
    ],
  },
  {
    titulo: "Suprimentos",
    itens: [
      {
        href: "/fornecedores",
        label: "Fornecedores",
        icone: <IconeFornecedor className={tamanhoIcone} />,
        papeis: ["admin", "estoque", "financeiro"],
      },
      {
        href: "/compras",
        label: "Compras & Financeiro",
        icone: <IconeFinanceiro className={tamanhoIcone} />,
        papeis: ["admin", "estoque", "financeiro"],
      },
      {
        href: "/margem",
        label: "Margem",
        icone: <IconeMargem className={tamanhoIcone} />,
        papeis: ["admin", "financeiro"],
      },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      {
        href: "/empresa",
        label: "Empresa",
        icone: <IconeEmpresa className={tamanhoIcone} />,
        papeis: ["admin"],
      },
      {
        href: "/personalizacao",
        label: "Personalização",
        icone: <IconePaleta className={tamanhoIcone} />,
        papeis: ["admin"],
      },
      {
        href: "/perfil",
        label: "Meu perfil",
        icone: <IconePerfil className={tamanhoIcone} />,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, sair, temPapel } = useAuth();
  const [branding, setBranding] = useState<Branding | null>(null);

  // A logo vem da Personalização — o painel segue a marca da loja.
  useEffect(() => {
    getBranding(0)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, []);

  const logo = resolveImagem(branding?.logo ?? null);
  const nomeLoja = branding?.nome_loja ?? "Samara Beach";

  return (
    <aside className="sticky top-0 z-20 flex h-screen w-60 flex-shrink-0 flex-col border-r border-panel-sidebarBorder bg-panel-sidebar shadow-[1px_0_3px_0_rgb(15_23_42/0.04)]">
      {/* Marca: só a logo. O nome da loja fica no title, para leitores de tela. */}
      <div className="flex h-24 flex-shrink-0 items-center justify-center border-b border-panel-sidebarBorder px-4">
        <Link
          href="/dashboard"
          title={nomeLoja}
          className="flex items-center justify-center rounded-xl transition hover:opacity-80"
        >
          {logo ? (
            <span className="relative block h-14 w-[200px]">
              <Image
                src={logo}
                alt={nomeLoja}
                fill
                sizes="200px"
                className="object-contain"
                priority
                unoptimized
              />
            </span>
          ) : (
            <span className="text-lg font-semibold text-panel-ink">
              {nomeLoja}
            </span>
          )}
        </Link>
      </div>

      {/* Navegação: rola sozinha quando não cabe, sem empurrar o rodapé. */}
      <nav className="rolagem-fina flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((grupo) => {
          const itens = grupo.itens.filter(
            (item) => !item.papeis || temPapel(item.papeis),
          );
          if (itens.length === 0) return null;

          return (
            <div key={grupo.titulo}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-panel-inkMuted">
                {grupo.titulo}
              </p>
              <div className="space-y-0.5">
                {itens.map((item) => {
                  const ativo = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        ativo
                          ? "bg-panel-accent/10 font-medium text-panel-accent"
                          : "text-panel-inkSoft hover:bg-panel-sidebarHover hover:text-panel-ink"
                      }`}
                    >
                      {/* Marcador do item ativo, na cor da marca. */}
                      {ativo && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-panel-accent" />
                      )}
                      <span
                        className={
                          ativo
                            ? "text-panel-accent"
                            : "text-panel-inkMuted transition group-hover:text-panel-inkSoft"
                        }
                      >
                        {item.icone}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {usuario && (
        <div className="flex-shrink-0 border-t border-panel-sidebarBorder p-3">
          <Link
            href="/perfil"
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-panel-sidebarHover"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-panel-accent text-sm font-semibold text-white">
              {(usuario.first_name || usuario.email).charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-panel-ink">
                {[usuario.first_name, usuario.last_name]
                  .filter(Boolean)
                  .join(" ") || usuario.email}
              </span>
              <span className="block text-[11px] text-panel-inkMuted">
                {usuario.papel ? PAPEL_LABEL[usuario.papel] : "Interno"}
              </span>
            </span>
          </Link>

          <div className="mt-1 flex items-center gap-1 px-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              title="Abrir a loja"
              className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-panel-inkMuted transition hover:bg-panel-sidebarHover hover:text-panel-ink"
            >
              <IconeLink className="h-3.5 w-3.5" />
              Ver loja
            </a>
            <button
              onClick={() => sair()}
              title="Sair"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-panel-inkMuted transition hover:bg-red-50 hover:text-red-600"
            >
              <IconeSair className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
