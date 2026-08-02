import Image from "next/image";
import Link from "next/link";
import { resolveImagem } from "@/lib/format";
import type { Branding } from "@/lib/branding";

export function Footer({ branding }: { branding: Branding }) {
  const logo = resolveImagem(branding.logo);

  return (
    <footer className="mt-16 border-t border-gray-100 bg-brand-sand">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-600">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div>
            {logo ? (
              <span className="relative block h-12 w-36">
                <Image
                  src={logo}
                  alt={branding.nome_loja}
                  fill
                  sizes="144px"
                  className="object-contain object-left"
                  unoptimized
                />
              </span>
            ) : (
              <p className="text-lg font-bold">{branding.nome_loja}</p>
            )}
            <p className="mt-2 max-w-xs text-gray-500">
              Moda praia com produção própria e curadoria. Biquínis, maiôs,
              saídas e acessórios.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="font-semibold text-brand-ink">Loja</p>
              <ul className="mt-2 space-y-1 text-gray-500">
                <li>
                  <Link href="/produtos" className="hover:text-brand-sea">
                    Produtos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/produtos?ordering=-created_at"
                    className="hover:text-brand-sea"
                  >
                    Novidades
                  </Link>
                </li>
                <li>
                  <Link href="/carrinho" className="hover:text-brand-sea">
                    Meu carrinho
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-brand-ink">Conta</p>
              <ul className="mt-2 space-y-1 text-gray-500">
                <li>
                  <Link href="/conta/login" className="hover:text-brand-sea">
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link href="/conta/pedidos" className="hover:text-brand-sea">
                    Meus pedidos
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          © {new Date().getFullYear()} {branding.nome_loja}. Todos os direitos
          reservados.
        </p>
      </div>
    </footer>
  );
}
