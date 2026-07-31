import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/ui/Price";

export interface ProductCardData {
  slug: string;
  nome: string;
  imagem: string | null;
  preco?: string | number | null;
  promocional?: string | number | null;
  tipoOrigem?: string;
}

export function ProductCard({ data }: { data: ProductCardData }) {
  return (
    <Link
      href={`/produtos/${data.slug}`}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:shadow-lg"
    >
      <div className="relative aspect-[3/4] w-full bg-brand-sand">
        {data.imagem ? (
          <Image
            src={data.imagem}
            alt={data.nome}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            sem imagem
          </div>
        )}
        {data.tipoOrigem === "producao_propria" && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-sea px-2 py-0.5 text-xs font-medium text-white">
            Produção própria
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-medium text-brand-ink group-hover:text-brand-sea">
          {data.nome}
        </h3>
        {data.preco != null && (
          <div className="mt-1">
            <Price preco={data.preco} promocional={data.promocional} />
          </div>
        )}
      </div>
    </Link>
  );
}
