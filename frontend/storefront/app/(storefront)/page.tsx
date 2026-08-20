import Link from "next/link";
import { lojaOnlineAtiva } from "@/lib/loja-online";
import { listarProdutosParaVitrine, listarCategorias } from "@/lib/api";
import { getBranding } from "@/lib/branding";
import { ProductCard } from "@/components/produto/ProductCard";
import { Hero } from "@/components/home/Hero";
import { CategoryCards } from "@/components/home/CategoryCards";

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
  // Loja desligada: o layout já renderiza a institucional no lugar desta
  // página. Retornar cedo evita que ela consulte a API (que responde 503),
  // porque o Next executa layout e página em paralelo.
  // `null` em vez de notFound(): o 404 fica cacheado e não revalida quando
  // a loja é religada.
  if (!(await lojaOnlineAtiva())) return null;

  const [{ cards }, categorias, branding] = await Promise.all([
    listarProdutosParaVitrine({ ordering: "-created_at" }),
    listarCategorias(),
    getBranding(),
  ]);
  const destaques = cards.slice(0, 8);
  // Categorias em cards (foto + nome), configuradas no painel.
  const temCards = categorias.some((c) => c.destaque && c.imagem);

  return (
    <div>
      {/* Hero configurável (Personalização) */}
      <Hero branding={branding} />

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

      {/* Categorias — em cards (foto+nome) se configuradas; senão, pílulas */}
      {temCards ? (
        <CategoryCards categorias={categorias} />
      ) : (
        categorias.length > 0 && (
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
        )
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
