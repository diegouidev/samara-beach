import { notFound } from "next/navigation";
import { lojaOnlineAtiva } from "@/lib/loja-online";
import { buscarProdutoPorSlug, apiGet } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { ProductDetail } from "@/components/produto/ProductDetail";
import { ProductReviews } from "@/components/produto/ProductReviews";
import type { Paginated, TabelaMedidas } from "@/lib/types";

export const revalidate = 60;

async function buscarTabelaMedidas(
  produtoId: string,
  categoriaId: string,
): Promise<TabelaMedidas | null> {
  try {
    const data = await apiGet<Paginated<TabelaMedidas>>(
      ENDPOINTS.tabelasMedidas,
      300,
    );
    return (
      data.results.find((t) => t.produto === produtoId) ??
      data.results.find((t) => t.categoria === categoriaId) ??
      null
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // generateMetadata roda antes do componente e não passa pelo guard dele —
  // sem esta saída, a página de produto ainda consultaria a API desligada.
  if (!(await lojaOnlineAtiva())) return {};
  const { slug } = await params;
  const { produto } = await buscarProdutoPorSlug(slug);
  if (!produto) return { title: "Produto não encontrado" };
  return {
    title: produto.nome,
    description: produto.descricao?.slice(0, 150) || produto.nome,
  };
}

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Loja desligada: o layout já renderiza a institucional no lugar desta
  // página. Retornar cedo evita que ela consulte a API (que responde 503),
  // porque o Next executa layout e página em paralelo.
  // `null` em vez de notFound(): o 404 fica cacheado e não revalida quando
  // a loja é religada.
  if (!(await lojaOnlineAtiva())) return null;

  const { slug } = await params;
  const { produto } = await buscarProdutoPorSlug(slug);

  if (!produto) notFound();

  const tabela = await buscarTabelaMedidas(produto.id, produto.categoria);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ProductDetail produto={produto} tabela={tabela} />
      <ProductReviews produtoId={produto.id} />
    </div>
  );
}
