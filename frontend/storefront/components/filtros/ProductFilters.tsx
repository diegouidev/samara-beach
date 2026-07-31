"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Categoria } from "@/lib/types";

/**
 * Filtros da listagem. Categoria e busca vão para a query string (usados pela API).
 * Cor/tamanho/preço são passados via query e aplicados no client sobre o resultado
 * (a API filtra esses campos no nível de variação — refinamento futuro).
 */
export function ProductFilters({
  categorias,
  cores,
  tamanhos,
}: {
  categorias: Categoria[];
  cores: string[];
  tamanhos: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get("search") ?? "");

  function setParam(chave: string, valor: string) {
    const novo = new URLSearchParams(params.toString());
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    router.push(`/produtos?${novo.toString()}`);
  }

  return (
    <aside className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam("search", busca);
        }}
      >
        <label className="text-sm font-medium text-brand-ink">Buscar</label>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="biquíni, saída..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-sea focus:outline-none"
        />
      </form>

      {categorias.length > 0 && (
        <div>
          <p className="text-sm font-medium text-brand-ink">Categoria</p>
          <div className="mt-2 space-y-1">
            <button
              onClick={() => setParam("categoria", "")}
              className={`block text-sm ${
                !params.get("categoria")
                  ? "font-semibold text-brand-sea"
                  : "text-gray-600 hover:text-brand-sea"
              }`}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setParam("categoria", c.id)}
                className={`block text-sm ${
                  params.get("categoria") === c.id
                    ? "font-semibold text-brand-sea"
                    : "text-gray-600 hover:text-brand-sea"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {cores.length > 0 && (
        <div>
          <p className="text-sm font-medium text-brand-ink">Cor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cores.map((cor) => (
              <button
                key={cor}
                onClick={() =>
                  setParam("cor", params.get("cor") === cor ? "" : cor)
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  params.get("cor") === cor
                    ? "border-brand-sea bg-brand-sea text-white"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {cor}
              </button>
            ))}
          </div>
        </div>
      )}

      {tamanhos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-brand-ink">Tamanho</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tamanhos.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setParam("tamanho", params.get("tamanho") === t ? "" : t)
                }
                className={`rounded-lg border px-3 py-1 text-xs ${
                  params.get("tamanho") === t
                    ? "border-brand-sea bg-brand-sea text-white"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
