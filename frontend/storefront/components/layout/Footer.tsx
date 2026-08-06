import Image from "next/image";
import Link from "next/link";
import { resolveImagem } from "@/lib/format";
import type { Branding } from "@/lib/branding";
import { URL_REDE, type EmpresaPublica } from "@/lib/empresa";

/** Ícones das redes — inline, para não depender de biblioteca. */
const ICONES = {
  instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V2.6A14 14 0 0 0 15 2.5c-2.4 0-4 1.5-4 4.2v1.8H8V12h3v9.5h3V12h2.6l.4-3.5H14Z" />
  ),
  tiktok: (
    <path d="M16 3a5 5 0 0 0 5 5v3a8 8 0 0 1-5-1.8V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3h3Z" />
  ),
} as const;

function IconeRede({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Footer({
  branding,
  empresa,
}: {
  branding: Branding;
  empresa: EmpresaPublica | null;
}) {
  const logo = resolveImagem(branding.logo);
  const nome = empresa?.nome_fantasia || branding.nome_loja;

  const redes = ([
    ["instagram", empresa?.instagram],
    ["facebook", empresa?.facebook],
    ["tiktok", empresa?.tiktok],
  ] as const).filter(([, usuario]) => Boolean(usuario));

  const temContato = Boolean(
    empresa?.telefone ||
      empresa?.whatsapp ||
      empresa?.email ||
      empresa?.horario_funcionamento,
  );

  return (
    <footer className="mt-16 border-t border-gray-100 bg-brand-sand">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-600">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            {logo ? (
              <span className="relative block h-16 w-48">
                <Image
                  src={logo}
                  alt={nome}
                  fill
                  sizes="192px"
                  className="object-contain object-left"
                  unoptimized
                />
              </span>
            ) : (
              <p className="text-lg font-bold">{nome}</p>
            )}
            <p className="mt-2 max-w-xs text-gray-500">
              Moda praia com produção própria e curadoria. Biquínis, maiôs,
              saídas e acessórios.
            </p>

            {redes.length > 0 && (
              <div className="mt-4 flex gap-3">
                {redes.map(([rede, usuario]) => (
                  <a
                    key={rede}
                    href={URL_REDE[rede](usuario as string)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${nome} no ${rede}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-brand-ink transition hover:bg-white hover:text-brand-sea"
                  >
                    <IconeRede>{ICONES[rede]}</IconeRede>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-12">
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

            {temContato && (
              <div>
                <p className="font-semibold text-brand-ink">Atendimento</p>
                <ul className="mt-2 space-y-1 text-gray-500">
                  {empresa?.whatsapp && (
                    <li>
                      <a
                        href={`https://wa.me/${empresa.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-sea"
                      >
                        WhatsApp
                      </a>
                    </li>
                  )}
                  {empresa?.telefone && (
                    <li>
                      <a
                        href={`tel:${empresa.telefone.replace(/\D/g, "")}`}
                        className="hover:text-brand-sea"
                      >
                        {empresa.telefone}
                      </a>
                    </li>
                  )}
                  {empresa?.email && (
                    <li>
                      <a
                        href={`mailto:${empresa.email}`}
                        className="hover:text-brand-sea"
                      >
                        {empresa.email}
                      </a>
                    </li>
                  )}
                  {empresa?.horario_funcionamento && (
                    <li className="whitespace-pre-line pt-1 text-xs">
                      {empresa.horario_funcionamento}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Identificação do fornecedor — exigida na venda online. */}
        <div className="mt-8 border-t border-black/5 pt-5 text-xs text-gray-400">
          {empresa?.razao_social && (
            <p>
              {empresa.razao_social}
              {empresa.cnpj && ` · CNPJ ${empresa.cnpj}`}
            </p>
          )}
          {empresa?.endereco_linha && (
            <p className="mt-0.5">{empresa.endereco_linha}</p>
          )}
          <p className="mt-2">
            © {new Date().getFullYear()} {nome}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
