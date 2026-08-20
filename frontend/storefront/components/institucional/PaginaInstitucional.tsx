import Image from "next/image";
import { resolveImagem } from "@/lib/format";
import { linkWhatsApp } from "@/lib/whatsapp";
import { URL_REDE, type EmpresaPublica } from "@/lib/empresa";
import type { Branding } from "@/lib/branding";

/**
 * Vitrine da marca exibida quando a loja online está desligada
 * (`LOJA_ONLINE_ATIVA=false` no backend/.env).
 *
 * Sem preço, sem carrinho, sem conta: o objetivo é levar quem chegou pelo
 * domínio até a loja física ou o WhatsApp. Herda as cores da marca das CSS
 * variables já injetadas pelo layout raiz.
 */
export function PaginaInstitucional({
  branding,
  empresa,
}: {
  branding: Branding;
  empresa: EmpresaPublica | null;
}) {
  const logo = resolveImagem(branding.logo);
  const nome = empresa?.nome_fantasia || branding.nome_loja;
  const whatsapp = empresa?.whatsapp || branding.whatsapp;
  const endereco = empresa?.endereco_linha;

  const redes = (
    [
      ["instagram", empresa?.instagram],
      ["facebook", empresa?.facebook],
      ["tiktok", empresa?.tiktok],
    ] as const
  ).filter(([, usuario]) => Boolean(usuario));

  return (
    <div className="flex min-h-screen flex-col bg-brand-sand">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        {logo ? (
          <span className="relative block h-24 w-64">
            <Image
              src={logo}
              alt={nome}
              fill
              sizes="256px"
              className="object-contain"
              priority
              unoptimized
            />
          </span>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight text-brand-ink">
            {nome}
          </h1>
        )}

        <p className="mt-8 text-lg font-medium text-brand-ink">
          Nossa loja online está em manutenção.
        </p>
        <p className="mt-2 max-w-md text-gray-600">
          Continuamos atendendo normalmente na loja física e pelo WhatsApp —
          fale com a gente para ver as novidades e fazer seu pedido.
        </p>

        {whatsapp && (
          <a
            href={linkWhatsApp(
              whatsapp,
              `Olá! Vim pelo site da ${nome} e gostaria de saber mais sobre as peças.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-sea px-8 py-4 text-base font-medium text-white transition hover:opacity-90"
          >
            <IconeWhatsApp className="h-5 w-5" />
            Falar no WhatsApp
          </a>
        )}

        {/* Texto da marca — vem da Personalização, a cliente edita sem SSH. */}
        {branding.hero_subtitulo && (
          <p className="mt-12 max-w-md text-sm leading-relaxed text-gray-600">
            {branding.hero_subtitulo}
          </p>
        )}

        {(endereco || empresa?.horario_funcionamento) && (
          // Duas colunas só quando há os dois blocos: com um só, ele fica
          // centralizado em vez de encostado à esquerda numa grade vazia.
          <div
            className={`mt-12 grid w-full gap-8 border-t border-black/5 pt-10 ${
              endereco && empresa?.horario_funcionamento
                ? "sm:grid-cols-2"
                : "justify-items-center"
            }`}
          >
            {endereco && (
              <div>
                <p className="text-sm font-semibold text-brand-ink">
                  Onde estamos
                </p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(endereco)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm text-gray-600 hover:text-brand-sea"
                >
                  {endereco}
                </a>
              </div>
            )}
            {empresa?.horario_funcionamento && (
              <div>
                <p className="text-sm font-semibold text-brand-ink">
                  Horário de atendimento
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                  {empresa.horario_funcionamento}
                </p>
              </div>
            )}
          </div>
        )}

        {redes.length > 0 && (
          <div className="mt-10 flex gap-3">
            {redes.map(([rede, usuario]) => (
              <a
                key={rede}
                href={URL_REDE[rede](usuario as string)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${nome} no ${rede}`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-brand-ink transition hover:bg-white hover:text-brand-sea"
              >
                <IconeRede rede={rede} />
              </a>
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 pb-10 text-center text-xs text-gray-400">
        {empresa?.razao_social && (
          <p>
            {empresa.razao_social}
            {empresa.cnpj && ` · CNPJ ${empresa.cnpj}`}
          </p>
        )}
        <p className="mt-1.5">
          © {new Date().getFullYear()} {nome}. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

function IconeWhatsApp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.04s.87 2.37.99 2.53c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

const CAMINHOS_REDE = {
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

function IconeRede({ rede }: { rede: keyof typeof CAMINHOS_REDE }) {
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
      {CAMINHOS_REDE[rede]}
    </svg>
  );
}
