import { listarProdutosParaVitrine, listarCategorias } from "@/lib/api";
import { ProductCard } from "@/components/produto/ProductCard";
import { ProductFilters } from "@/components/filtros/ProductFilters";
import { MOCK_PRODUTOS } from "@/lib/mocks";

export const revalidate = 60;

export const metadata = {
  title: "Produtos",
  description: "Listagem de produtos de moda praia com filtros.",
};

// Cores/tamanhos para os filtros — derivados dos mocks + variações conhecidas.
function opcoesDeVariacao() {
  const cores = new Set<string>();
  const tamanhos = new Set<string>();
  for (const p of MOCK_PRODUTOS) {
    for (const v of p.variacoes) {
      if (v.cor) cores.add(v.cor);
      if (v.tamanho) tamanhos.add(v.tamanho);
    }
  }
  return { cores: [...cores], tamanhos: [...tamanhos] };
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [{ cards, usouMock }, categorias] = await Promise.all([
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
  ]);

  const { cores, tamanhos } = opcoesDeVariacao();

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
          {usouMock && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
              Exibindo produtos de demonstração.
            </p>
          )}

          {cards.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
              Nenhum produto encontrado para os filtros selecionados.
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
