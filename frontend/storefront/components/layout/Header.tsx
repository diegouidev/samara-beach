"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/providers/AuthProvider";
import { resolveImagem } from "@/lib/format";
import type { Branding } from "@/lib/branding";
import type { Categoria } from "@/lib/types";

/** Ícone de sacola/carrinho (inline para não depender de biblioteca). */
function IconeCarrinho({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconeMenu({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function IconeFechar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function Header({
  branding,
  categorias,
}: {
  branding: Branding;
  categorias: Categoria[];
}) {
  // Menu montado a partir das categorias reais do painel (a listagem filtra por id).
  const linksNav = [
    { href: "/produtos", label: "Produtos" },
    ...categorias.slice(0, 4).map((c) => ({
      href: `/produtos?categoria=${c.id}`,
      label: c.nome,
    })),
  ];

  // Assina `itens` (e não o seletor `totalItens`): a função tem referência
  // estável, então o contador não re-renderizava ao adicionar um produto.
  const itens = useCart((s) => s.itens);
  const { usuario, sair } = useAuth();
  const [montado, setMontado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  // Evita mismatch de hidratação (carrinho vem do localStorage).
  useEffect(() => setMontado(true), []);
  const qtd = montado
    ? itens.reduce((acc, item) => acc + item.quantidade, 0)
    : 0;

  // Trava o scroll do body com o menu mobile aberto.
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  const logo = resolveImagem(branding.logo);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        {/* Hambúrguer — só no mobile */}
        <button
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-brand-ink transition hover:bg-brand-sand md:hidden"
        >
          <IconeMenu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-3">
          {logo ? (
            <span className="relative block h-14 w-44">
              <Image
                src={logo}
                alt={branding.nome_loja}
                fill
                sizes="176px"
                className="object-contain object-left"
                priority
                unoptimized
              />
            </span>
          ) : (
            <span className="text-xl font-bold tracking-tight">
              {branding.nome_loja}
            </span>
          )}
        </Link>

        <nav className="hidden gap-6 text-sm font-medium text-gray-600 md:flex">
          {linksNav.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-brand-sea">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-sm">
          {/* Links de conta: só no desktop (no mobile ficam no drawer). */}
          {usuario ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/conta/pedidos" className="hover:text-brand-sea">
                Meus pedidos
              </Link>
              <button
                onClick={() => sair()}
                className="text-gray-500 hover:text-brand-coral"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link href="/conta/login" className="hidden hover:text-brand-sea md:block">
              Entrar
            </Link>
          )}

          <Link
            href="/carrinho"
            aria-label={`Carrinho${qtd > 0 ? ` (${qtd} itens)` : ""}`}
            title="Carrinho"
            className="relative rounded-full p-2 text-brand-ink transition hover:bg-brand-sand hover:text-brand-sea"
          >
            <IconeCarrinho className="h-6 w-6" />
            {qtd > 0 && (
              // key={qtd} remonta o badge a cada mudança, reiniciando o pulso.
              <span
                key={qtd}
                className="animate-pulso-badge absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-coral text-xs font-medium text-white"
              >
                {qtd}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ---- Menu mobile (drawer) ---- */}
      <div
        onClick={() => setMenuAberto(false)}
        className={`fixed inset-0 z-50 bg-slate-900/50 transition-opacity md:hidden ${
          menuAberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] bg-white shadow-xl transition-transform duration-300 md:hidden ${
          menuAberto ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <span className="font-bold text-brand-ink">{branding.nome_loja}</span>
          <button
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-ink hover:bg-brand-sand"
          >
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col p-2">
          {linksNav.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMenuAberto(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-brand-ink transition hover:bg-brand-sand"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-2 border-t border-gray-100" />
          {usuario ? (
            <>
              <Link
                href="/conta/pedidos"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-brand-ink hover:bg-brand-sand"
              >
                Meus pedidos
              </Link>
              <button
                onClick={() => {
                  sair();
                  setMenuAberto(false);
                }}
                className="rounded-lg px-4 py-3 text-left text-sm font-medium text-brand-coral hover:bg-brand-sand"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/conta/login"
              onClick={() => setMenuAberto(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-brand-ink hover:bg-brand-sand"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
