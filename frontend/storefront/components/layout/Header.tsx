"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/providers/AuthProvider";

export function Header() {
  const totalItens = useCart((s) => s.totalItens);
  const { usuario, sair } = useAuth();
  const [montado, setMontado] = useState(false);

  // Evita mismatch de hidratação (carrinho vem do localStorage).
  useEffect(() => setMontado(true), []);
  const qtd = montado ? totalItens() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Samara <span className="text-brand-sea">Beach</span>
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
            className="relative rounded-full bg-brand-sea px-4 py-2 font-medium text-white hover:bg-brand-seaDark"
          >
            Carrinho
            {qtd > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-coral text-xs text-white">
                {qtd}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
