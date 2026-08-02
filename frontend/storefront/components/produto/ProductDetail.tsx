"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
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

  /** Tamanhos que existem de fato na cor informada. */
  const tamanhosDaCor = useCallback(
    (c: string) =>
      variacoesAtivas.filter((v) => v.cor === c).map((v) => v.tamanho),
    [variacoesAtivas],
  );

  const corInicial = cores[0] ?? "";
  const [cor, setCor] = useState(corInicial);
  const [tamanho, setTamanho] = useState(
    () => tamanhosDaCor(corInicial)[0] ?? "",
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  /**
   * Ao trocar de cor, o tamanho selecionado pode não existir nela (ex.: preto
   * só no M, vermelho só no G). Nesse caso cai para o primeiro tamanho
   * disponível — nunca se mantém uma combinação inexistente.
   */
  function escolherCor(nova: string) {
    setCor(nova);
    const disponiveis = tamanhosDaCor(nova);
    if (!disponiveis.includes(tamanho)) {
      setTamanho(disponiveis[0] ?? "");
    }
  }

  // Sem fallback: a variação é exatamente a combinação escolhida ou nenhuma.
  const variacao = variacoesAtivas.find(
    (v) => v.cor === cor && v.tamanho === tamanho,
  );

  const disponiveisNaCor = tamanhosDaCor(cor);

  // A variação escolhida pode não ter foto própria; usa a da mesma cor e,
  // em último caso, qualquer foto do produto — em vez de exibir vazio.
  const imagens = useMemo(() => {
    const candidatas = [
      ...(variacao ? [variacao] : []),
      ...variacoesAtivas.filter((v) => v.cor === cor),
      ...variacoesAtivas,
    ];
    for (const v of candidatas) {
      const imgs = imagensDaVariacao(v);
      if (imgs.length > 0) return imgs;
    }
    return [];
  }, [variacao, variacoesAtivas, cor]);

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
    setFeedback(
      `${produto.nome}${variacao.tamanho ? ` (${variacao.tamanho})` : ""} adicionado ao carrinho`,
    );
    setTimeout(() => setFeedback(null), 4000);
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
                  onClick={() => escolherCor(c)}
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
              {tamanhos.map((t) => {
                // Tamanho que não existe na cor escolhida fica visível, porém
                // desabilitado — o cliente vê a grade completa sem conseguir
                // selecionar uma combinação que não está à venda.
                const indisponivel = !disponiveisNaCor.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => setTamanho(t)}
                    disabled={indisponivel}
                    title={
                      indisponivel
                        ? `Tamanho ${t} indisponível${cor ? ` na cor ${cor}` : ""}`
                        : undefined
                    }
                    className={`rounded-lg border px-4 py-1.5 text-sm ${
                      indisponivel
                        ? "cursor-not-allowed border-gray-200 text-gray-300 line-through"
                        : t === tamanho
                          ? "border-brand-sea bg-brand-sea text-white"
                          : "border-gray-300 text-gray-700 hover:border-brand-sea"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {cores.length > 0 && disponiveisNaCor.length < tamanhos.length && (
              <p className="mt-2 text-xs text-gray-400">
                Disponível em {cor}: {disponiveisNaCor.join(", ")}
              </p>
            )}
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
          <p
            role="status"
            className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          >
            <span aria-hidden="true">✓</span>
            {feedback}
            <Link href="/carrinho" className="underline hover:no-underline">
              Ver carrinho
            </Link>
          </p>
        )}

        {variacao && (
          <p className="mt-3 text-xs text-gray-400">SKU: {variacao.sku}</p>
        )}

        {tabela && <SizeTable tabela={tabela} />}
      </div>
    </div>
  );
}
