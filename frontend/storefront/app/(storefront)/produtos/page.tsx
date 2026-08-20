import { lojaOnlineAtiva } from "@/lib/loja-online";
import { listarProdutos, listarProdutosParaVitrine, listarCategorias } from "@/lib/api";
import { ProductCard } from "@/components/produto/ProductCard";
import { ProductFilters } from "@/components/filtros/ProductFilters";

export const revalidate = 60;

export const metadata = {
  title: "Produtos",
  description: "Listagem de produtos de moda praia com filtros.",
};

/**
 * Cores/tamanhos disponíveis para os filtros — derivados do catálogo real
 * (lista completa, sem os filtros aplicados, para as opções não sumirem
 * conforme o cliente vai filtrando).
 */
async function opcoesDeVariacao() {
  const { produtos } = await listarProdutos();
  const cores = new Set<string>();
  const tamanhos = new Set<string>();
  for (const p of produtos) {
    if (p.variacao_destaque?.cor) cores.add(p.variacao_destaque.cor);
    for (const t of p.tamanhos ?? []) tamanhos.add(t);
  }
  return { cores: [...cores].sort(), tamanhos: [...tamanhos].sort() };
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Loja desligada: o layout já renderiza a institucional no lugar desta
  // página. Retornar cedo evita que ela consulte a API (que responde 503),
  // porque o Next executa layout e página em paralelo.
  // `null` em vez de notFound(): o 404 fica cacheado e não revalida quando
  // a loja é religada.
  if (!(await lojaOnlineAtiva())) return null;

  const sp = await searchParams;
  const [{ cards }, categorias, { cores, tamanhos }] = await Promise.all([
    listarProdutosParaVitrine({
      categoria: sp.categoria,
      search: sp.search,
      cor: sp.cor,
      tamanho: sp.tamanho,
      preco_min: sp.preco_min,
      preco_max: sp.preco_max,
      ordering: sp.ordering,
    }),
    listarCategorias(),
    opcoesDeVariacao(),
  ]);

  const temFiltro = Boolean(
    sp.categoria || sp.search || sp.cor || sp.tamanho || sp.preco_min || sp.preco_max,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-ink">Produtos</h1>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <ProductFilters
          categorias={categorias}
          cores={cores}
          tamanhos={tamanhos}
        />

        <div>
          {cards.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
              {temFiltro
                ? "Nenhum produto encontrado para os filtros selecionados."
                : "Nenhum produto publicado ainda."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {cards.map((card) => (
                <ProductCard key={card.slug} data={card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
