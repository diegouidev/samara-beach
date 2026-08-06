import { notFound } from "next/navigation";
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
