"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductGallery } from "./ProductGallery";
import { SizeTable } from "./SizeTable";
import { Price } from "@/components/ui/Price";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { resolveImagem } from "@/lib/format";
import type { Produto, TabelaMedidas, VariacaoProduto } from "@/lib/types";

function imagensDaVariacao(v: VariacaoProduto) {
  return v.imagens
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((img) => ({
      src: resolveImagem(img.imagem, img.url_externa) ?? "",
      alt: img.alt_text || "Imagem do produto",
    }))
    .filter((i) => i.src);
}

export function ProductDetail({
  produto,
  tabela,
}: {
  produto: Produto;
  tabela: TabelaMedidas | null;
}) {
  const router = useRouter();
  const adicionar = useCart((s) => s.adicionar);
  const wishlist = useWishlist();
  const naWishlist = wishlist.slugs.includes(produto.slug);
  const variacoesAtivas = produto.variacoes.filter((v) => v.ativo);

  const cores = useMemo(
    () => [...new Set(variacoesAtivas.map((v) => v.cor).filter(Boolean))],
    [variacoesAtivas],
  );
  const tamanhos = useMemo(
    () => [...new Set(variacoesAtivas.map((v) => v.tamanho).filter(Boolean))],
    [variacoesAtivas],
  );

  const [cor, setCor] = useState(cores[0] ?? "");
  const [tamanho, setTamanho] = useState(tamanhos[0] ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Variação selecionada (por cor+tamanho), com fallback para a primeira ativa.
  const variacao =
    variacoesAtivas.find((v) => v.cor === cor && v.tamanho === tamanho) ??
    variacoesAtivas.find((v) => v.cor === cor) ??
    variacoesAtivas[0];

  const imagens = variacao ? imagensDaVariacao(variacao) : [];

  function handleAdicionar() {
    if (!variacao) return;
    adicionar({
      variacaoId: variacao.id,
      produtoSlug: produto.slug,
      produtoNome: produto.nome,
      sku: variacao.sku,
      cor: variacao.cor,
      tamanho: variacao.tamanho,
      precoUnitario: Number(variacao.preco_vigente),
      imagem: imagens[0]?.src ?? null,
      quantidade: 1,
    });
    setFeedback("Adicionado ao carrinho!");
    setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <ProductGallery imagens={imagens} />

      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-brand-ink">{produto.nome}</h1>
          <button
            onClick={() => wishlist.alternar(produto.slug)}
            aria-label="Favoritar"
            className={`text-2xl ${naWishlist ? "text-brand-coral" : "text-gray-300 hover:text-brand-coral"}`}
          >
            {naWishlist ? "♥" : "♡"}
          </button>
        </div>
        {variacao && (
          <div className="mt-2 text-xl">
            <Price
              preco={variacao.preco}
              promocional={variacao.preco_promocional}
            />
          </div>
        )}

        {produto.descricao && (
          <p className="mt-4 text-gray-600">{produto.descricao}</p>
        )}

        {cores.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-brand-ink">Cor</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cores.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    c === cor
                      ? "border-brand-sea bg-brand-sea text-white"
                      : "border-gray-300 text-gray-700 hover:border-brand-sea"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {tamanhos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-brand-ink">Tamanho</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tamanhos.map((t) => (
                <button
                  key={t}
                  onClick={() => setTamanho(t)}
                  className={`rounded-lg border px-4 py-1.5 text-sm ${
                    t === tamanho
                      ? "border-brand-sea bg-brand-sea text-white"
                      : "border-gray-300 text-gray-700 hover:border-brand-sea"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleAdicionar}
            disabled={!variacao}
            className="rounded-full bg-brand-coral px-8 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Adicionar ao carrinho
          </button>
          <button
            onClick={() => {
              handleAdicionar();
              router.push("/carrinho");
            }}
            disabled={!variacao}
            className="rounded-full border border-brand-sea px-6 py-3 font-medium text-brand-sea hover:bg-brand-sand disabled:opacity-50"
          >
            Comprar agora
          </button>
        </div>
        {feedback && (
          <p className="mt-3 text-sm font-medium text-brand-sea">{feedback}</p>
        )}

        {variacao && (
          <p className="mt-3 text-xs text-gray-400">SKU: {variacao.sku}</p>
        )}

        {tabela && <SizeTable tabela={tabela} />}
      </div>
    </div>
  );
}
