import Image from "next/image";
import Link from "next/link";
import { listarProdutosParaVitrine, listarCategorias } from "@/lib/api";
import { ProductCard } from "@/components/produto/ProductCard";

// Home é Server Component com ISR (bom para SEO).
export const revalidate = 60;

const BENEFICIOS = [
  {
    titulo: "Frete grátis",
    texto: "Acima de R$ 299 para todo o Brasil",
    icone: (
      <>
        <path d="M2 8h11v9H2z" />
        <path d="M13 11h4.5l3 3.2V17H13z" />
        <circle cx="6.5" cy="18.5" r="1.8" />
        <circle cx="17" cy="18.5" r="1.8" />
      </>
    ),
  },
  {
    titulo: "Troca fácil",
    texto: "30 dias para trocar o tamanho",
    icone: (
      <>
        <path d="M3 9h13a5 5 0 0 1 0 10h-6" />
        <path d="m7 5-4 4 4 4" />
      </>
    ),
  },
  {
    titulo: "Até 3x sem juros",
    texto: "No cartão, ou PIX com desconto",
    icone: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
        <path d="M2.5 10h19" />
      </>
    ),
  },
  {
    titulo: "Produção própria",
    texto: "Modelagem pensada no corpo real",
    icone: (
      <>
        <path d="m12 3 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.8 6.62 19.6l1.03-6L3.3 9.4l6-.9L12 3Z" />
      </>
    ),
  },
];

export default async function HomePage() {
  const [{ cards, usouMock }, categorias] = await Promise.all([
    listarProdutosParaVitrine({ ordering: "-created_at" }),
    listarCategorias(),
  ]);
  const destaques = cards.slice(0, 8);
  // A capa do hero vem do produto mais recente — a loja nunca fica sem imagem.
  const capa = cards.find((c) => c.imagem)?.imagem ?? null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-sand">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-sea shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-coral" />
              Nova coleção de verão
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-brand-ink md:text-6xl">
              Moda praia que
              <br />
              combina com o
              <br />
              <span className="text-brand-sea">seu verão.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600">
              Biquínis, maiôs, saídas e acessórios — com produção própria e
              curadoria especial. Encontre o seu look à beira-mar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/produtos"
                className="rounded-full bg-brand-coral px-8 py-3.5 font-medium text-white shadow-lg shadow-brand-coral/20 transition hover:opacity-90"
              >
                Ver coleção
              </Link>
              <Link
                href="/produtos?ordering=-created_at"
                className="rounded-full border border-brand-ink/15 bg-white/60 px-8 py-3.5 font-medium text-brand-ink backdrop-blur transition hover:border-brand-ink/40"
              >
                Novidades
              </Link>
            </div>
          </div>

          {capa && (
            <div className="relative hidden md:block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl">
                <Image
                  src={capa}
                  alt="Coleção de verão"
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                  priority
                  unoptimized
                />
              </div>
              {/* Selo flutuante — recurso comum nas vitrines de moda praia. */}
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-white px-5 py-4 shadow-xl">
                <p className="text-xs text-gray-500">A partir de</p>
                <p className="text-xl font-bold text-brand-ink">
                  12x sem juros
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Benefícios */}
      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="flex items-start gap-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 flex-shrink-0 text-brand-sea"
                aria-hidden="true"
              >
                {b.icone}
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-ink">
                  {b.titulo}
                </p>
                <p className="text-xs leading-snug text-gray-500">{b.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      {categorias.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <h2 className="text-2xl font-bold tracking-tight text-brand-ink">
            Navegue por categoria
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/produtos?categoria=${c.slug}`}
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-brand-ink transition hover:border-brand-sea hover:text-brand-sea"
              >
                {c.nome}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Destaques */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-brand-ink">
              Destaques
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              As peças que acabaram de chegar
            </p>
          </div>
          <Link
            href="/produtos"
            className="whitespace-nowrap text-sm font-medium text-brand-sea hover:underline"
          >
            Ver tudo →
          </Link>
        </div>

        {usouMock && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Exibindo produtos de demonstração (a API ainda não retornou itens).
          </p>
        )}

        {destaques.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
            Nenhum produto publicado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {destaques.map((card) => (
              <ProductCard key={card.slug} data={card} />
            ))}
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="bg-brand-ink">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold text-white">
            Entre na lista do verão
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            Receba os lançamentos e as promoções antes de todo mundo.
          </p>
          <form className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              placeholder="seu@email.com"
              className="h-12 flex-1 rounded-full border border-white/15 bg-white/10 px-5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="h-12 rounded-full bg-brand-coral px-7 text-sm font-medium text-white transition hover:opacity-90"
            >
              Quero receber
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
