"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL, resolveImagem } from "@/lib/format";
import { inputClass } from "@/components/ui";
import type { VariacaoPDV } from "@/lib/types";

/**
 * Busca do balcão: digita SKU/nome e Enter adiciona o primeiro resultado.
 * O campo mantém o foco entre as vendas — o operador não precisa do mouse.
 */
export function BuscaProduto({
  onSelecionar,
}: {
  onSelecionar: (v: VariacaoPDV) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<VariacaoPDV[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce: evita uma request por tecla digitada.
  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(() => {
      setCarregando(true);
      api
        .buscarParaVenda(termo)
        .then(setResultados)
        .catch((e) =>
          setErro(e instanceof Error ? e.message : "Falha na busca."),
        )
        .finally(() => setCarregando(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [termo]);

  function adicionar(v: VariacaoPDV) {
    onSelecionar(v);
    setTermo("");
    setResultados([]);
    inputRef.current?.focus();
  }

  return (
    <div>
      <input
        ref={inputRef}
        className={`${inputClass} text-base`}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onKeyDown={(e) => {
          // Enter adiciona o primeiro resultado — fluxo de leitor de código.
          if (e.key === "Enter" && resultados.length > 0) {
            e.preventDefault();
            adicionar(resultados[0]);
          }
          if (e.key === "Escape") {
            setTermo("");
            setResultados([]);
          }
        }}
        placeholder="Buscar por SKU, produto ou cor… (Enter adiciona)"
        autoComplete="off"
      />

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      {carregando && (
        <p className="mt-2 text-xs text-slate-400">Buscando…</p>
      )}

      {resultados.length > 0 && (
        <ul className="mt-2 max-h-80 divide-y divide-panel-border overflow-y-auto rounded-lg border border-panel-border">
          {resultados.map((v) => {
            const foto = resolveImagem(v.imagem);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => adicionar(v)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-panel-border bg-slate-50">
                    {foto && (
                      <Image
                        src={foto}
                        alt={v.produto}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-panel-ink">
                      {v.produto}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {[v.cor, v.tamanho].filter(Boolean).join(" · ")} ·{" "}
                      {v.sku}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-medium">
                      {formatBRL(v.preco)}
                    </span>
                    <span
                      className={`block text-xs ${
                        v.saldo > 0 ? "text-panel-inkMuted" : "text-red-600"
                      }`}
                    >
                      {v.saldo > 0 ? `${v.saldo} em estoque` : "sem estoque"}
                    </span>
                    {/* A peça está na loja e pode ser vendida no balcão — mas
                        alguém já pediu online, e vender a última sem saber
                        disso vira cancelamento depois. */}
                    {(v.reservado ?? 0) > 0 && (
                      <span className="mt-0.5 block text-xs font-medium text-amber-700">
                        {v.reservado} reservado
                        {v.reservado > 1 ? "s" : ""} online
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
