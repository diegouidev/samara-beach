import Image from "next/image";
import Link from "next/link";
import { resolveImagem } from "@/lib/format";
import type { Categoria } from "@/lib/types";

/**
 * Vitrine de categorias em cards com foto e nome sobreposto.
 * Mostra só as categorias marcadas como "destaque" que tenham imagem.
 */
export function CategoryCards({ categorias }: { categorias: Categoria[] }) {
  const cards = categorias
    .filter((c) => c.destaque && c.imagem)
    .sort((a, b) => a.ordem - b.ordem);

  if (cards.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-brand-ink">
        Navegue por categoria
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={`/produtos?categoria=${c.slug}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl"
          >
            <Image
              src={resolveImagem(c.imagem) ?? ""}
              alt={c.nome}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              unoptimized
            />
            {/* Gradiente para o nome ficar legível sobre qualquer foto. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <span className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-white drop-shadow">
              {c.nome}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
