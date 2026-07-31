"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { formatBRL } from "@/lib/format";

export function CartView() {
  const { itens, alterarQtd, remover, subtotal } = useCart();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) {
    return <p className="text-gray-500">Carregando carrinho...</p>;
  }

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
        <p className="text-gray-500">Seu carrinho está vazio.</p>
        <Link
          href="/produtos"
          className="mt-4 inline-block rounded-full bg-brand-sea px-6 py-2 text-white hover:bg-brand-seaDark"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="space-y-4">
        {itens.map((item) => (
          <li
            key={item.variacaoId}
            className="flex gap-4 rounded-2xl border border-gray-100 p-4"
          >
            <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-brand-sand">
              {item.imagem && (
                <Image
                  src={item.imagem}
                  alt={item.produtoNome}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/produtos/${item.produtoSlug}`}
                  className="font-medium text-brand-ink hover:text-brand-sea"
                >
                  {item.produtoNome}
                </Link>
                <p className="text-sm text-gray-500">
                  {[item.cor, item.tamanho].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button
                    onClick={() =>
                      alterarQtd(item.variacaoId, item.quantidade - 1)
                    }
                    className="px-3 py-1 text-gray-600 hover:text-brand-sea"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm">
                    {item.quantidade}
                  </span>
                  <button
                    onClick={() =>
                      alterarQtd(item.variacaoId, item.quantidade + 1)
                    }
                    className="px-3 py-1 text-gray-600 hover:text-brand-sea"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => remover(item.variacaoId)}
                  className="text-sm text-gray-400 hover:text-brand-coral"
                >
                  Remover
                </button>
              </div>
            </div>
            <div className="text-right font-medium text-brand-ink">
              {formatBRL(item.precoUnitario * item.quantidade)}
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold">Resumo</h2>
        <div className="mt-4 flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal())}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-gray-400">
          <span>Frete</span>
          <span>calculado no checkout</span>
        </div>
        <Link
          href="/checkout"
          className="mt-6 block rounded-full bg-brand-coral py-3 text-center font-medium text-white hover:opacity-90"
        >
          Ir para o checkout
        </Link>
      </aside>
    </div>
  );
}
