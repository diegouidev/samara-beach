"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/providers/AuthProvider";
import { resolveImagem } from "@/lib/format";
import type { Branding } from "@/lib/branding";

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

export function Header({ branding }: { branding: Branding }) {
  // Assina `itens` (e não o seletor `totalItens`): a função tem referência
  // estável, então o contador não re-renderizava ao adicionar um produto.
  const itens = useCart((s) => s.itens);
  const { usuario, sair } = useAuth();
  const [montado, setMontado] = useState(false);

  // Evita mismatch de hidratação (carrinho vem do localStorage).
  useEffect(() => setMontado(true), []);
  const qtd = montado
    ? itens.reduce((acc, item) => acc + item.quantidade, 0)
    : 0;

  const logo = resolveImagem(branding.logo);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          {logo ? (
            <span className="relative block h-11 w-32">
              <Image
                src={logo}
                alt={branding.nome_loja}
                fill
                sizes="128px"
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
          <Link href="/produtos" className="hover:text-brand-sea">
            Produtos
          </Link>
          <Link href="/produtos?categoria=biquinis" className="hover:text-brand-sea">
            Biquínis
          </Link>
          <Link
            href="/produtos?categoria=saidas-de-praia"
            className="hover:text-brand-sea"
          >
            Saídas
          </Link>
        </nav>

        <div className="flex items-center gap-4 text-sm">
          {usuario ? (
            <div className="flex items-center gap-3">
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
            <Link href="/conta/login" className="hover:text-brand-sea">
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
    </header>
  );
}
