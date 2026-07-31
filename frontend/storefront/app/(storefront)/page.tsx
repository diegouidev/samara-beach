import Link from "next/link";
import { listarProdutosParaVitrine } from "@/lib/api";
import { ProductCard } from "@/components/produto/ProductCard";

// Home é Server Component com ISR (bom para SEO).
export const revalidate = 60;

export default async function HomePage() {
  const { cards, usouMock } = await listarProdutosParaVitrine({
    ordering: "-created_at",
  });
  const destaques = cards.slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-sand">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-20">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-sea">
            Nova coleção de verão
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-brand-ink md:text-5xl">
            Moda praia que combina com o seu verão.
          </h1>
          <p className="max-w-xl text-gray-600">
            Biquínis, maiôs, saídas e acessórios — com produção própria e
            curadoria especial. Encontre o seu look à beira-mar.
          </p>
          <Link
            href="/produtos"
            className="mt-2 rounded-full bg-brand-coral px-8 py-3 font-medium text-white transition hover:opacity-90"
          >
            Ver produtos
          </Link>
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-brand-ink">Destaques</h2>
          <Link href="/produtos" className="text-sm text-brand-sea hover:underline">
            Ver tudo →
          </Link>
        </div>

        {usouMock && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Exibindo produtos de demonstração (a API ainda não retornou itens).
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {destaques.map((card) => (
            <ProductCard key={card.slug} data={card} />
          ))}
        </div>
      </section>
    </div>
  );
}
