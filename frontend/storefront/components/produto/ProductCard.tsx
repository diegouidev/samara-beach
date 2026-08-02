"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Price } from "@/components/ui/Price";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { formatBRL } from "@/lib/format";

export interface ProductCardData {
  slug: string;
  nome: string;
  imagem: string | null;
  preco?: string | number | null;
  promocional?: string | number | null;
  tipoOrigem?: string;
  /** Tamanhos disponíveis — mostrados no hover, como nas grandes lojas. */
  tamanhos?: string[];
  totalVariacoes?: number;
  /** SKU exibido: com um só, o card adiciona ao carrinho direto. */
  variacaoId?: string | null;
  sku?: string;
  cor?: string;
  tamanho?: string;
}

function IconeCoracao({ preenchido }: { preenchido: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={preenchido ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13Z" />
    </svg>
  );
}

export function ProductCard({ data }: { data: ProductCardData }) {
  const adicionar = useCart((s) => s.adicionar);
  const favoritos = useWishlist((s) => s.slugs);
  const alternarFavorito = useWishlist((s) => s.alternar);
  const [adicionado, setAdicionado] = useState(false);

  const favorito = favoritos.includes(data.slug);
  const precoCheio = Number(data.preco ?? 0);
  const precoVigente = Number(data.promocional ?? data.preco ?? 0);
  const temPromo = precoVigente > 0 && precoVigente < precoCheio;
  const descontoPct = temPromo
    ? Math.round((1 - precoVigente / precoCheio) * 100)
    : 0;

  // Com uma única variação não há o que escolher: o card compra direto.
  const compraDireta = data.totalVariacoes === 1 && Boolean(data.variacaoId);

  function comprar() {
    if (!data.variacaoId) return;
    adicionar({
      variacaoId: data.variacaoId,
      produtoSlug: data.slug,
      produtoNome: data.nome,
      sku: data.sku ?? "",
      cor: data.cor ?? "",
      tamanho: data.tamanho ?? "",
      precoUnitario: precoVigente,
      imagem: data.imagem,
      quantidade: 1,
    });
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2000);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-[0_12px_28px_-12px_rgb(15_23_42/0.18)]">
      <Link
        href={`/produtos/${data.slug}`}
        className="relative block aspect-[3/4] w-full overflow-hidden bg-brand-sand"
      >
        {data.imagem ? (
          <Image
            src={data.imagem}
            alt={data.nome}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-gray-300">
            sem imagem
          </span>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {temPromo && (
            <span className="rounded-full bg-brand-coral px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              −{descontoPct}%
            </span>
          )}
          {data.tipoOrigem === "producao_propria" && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-brand-sea shadow-sm">
              Produção própria
            </span>
          )}
        </div>
      </Link>

      {/* Favoritar fica fora do link para não navegar ao clicar. */}
      <button
        type="button"
        onClick={() => alternarFavorito(data.slug)}
        aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
        aria-pressed={favorito}
        className={`absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${
          favorito ? "text-brand-coral" : "text-gray-400 hover:text-brand-coral"
        }`}
      >
        <IconeCoracao preenchido={favorito} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/produtos/${data.slug}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-brand-ink transition group-hover:text-brand-sea">
            {data.nome}
          </h3>
        </Link>

        {data.preco != null && (
          <div className="mt-1.5">
            <Price preco={data.preco} promocional={data.promocional} />
            {precoVigente >= 30 && (
              <p className="mt-0.5 text-xs text-gray-400">
                ou 3x de {formatBRL(precoVigente / 3)} sem juros
              </p>
            )}
          </div>
        )}

        {data.tamanhos && data.tamanhos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.tamanhos.slice(0, 5).map((t) => (
              <span
                key={t}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-500"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Ação principal do card: compra direta quando não há escolha a fazer. */}
        <div className="mt-3 pt-1">
          {compraDireta ? (
            <button
              type="button"
              onClick={comprar}
              className={`w-full rounded-full px-4 py-2.5 text-sm font-medium transition ${
                adicionado
                  ? "bg-emerald-600 text-white"
                  : "bg-brand-ink text-white hover:bg-brand-sea"
              }`}
            >
              {adicionado ? "✓ Adicionado" : "Adicionar à sacola"}
            </button>
          ) : (
            <Link
              href={`/produtos/${data.slug}`}
              className="block w-full rounded-full border border-brand-ink px-4 py-2.5 text-center text-sm font-medium text-brand-ink transition hover:bg-brand-ink hover:text-white"
            >
              Escolher tamanho
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
