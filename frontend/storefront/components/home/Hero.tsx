import Image from "next/image";
import Link from "next/link";
import { resolveImagem } from "@/lib/format";
import type { Branding } from "@/lib/branding";

/**
 * Topo da home, configurável na Personalização:
 * - texto:  só os textos, sobre a cor de fundo (areia).
 * - foto:   imagem de fundo com os textos por cima.
 * - banner: banner com arte pronta (só a imagem, sem textos), opcionalmente linkado.
 */
export function Hero({ branding }: { branding: Branding }) {
  const imagem = resolveImagem(branding.hero_imagem);

  // --- Modo BANNER: só a imagem (arte pronta) ---
  if (branding.hero_modo === "banner" && imagem) {
    const conteudo = (
      <div className="relative aspect-[16/6] w-full overflow-hidden md:rounded-b-3xl">
        <Image
          src={imagem}
          alt={branding.nome_loja}
          fill
          sizes="100vw"
          className="object-cover"
          priority
          unoptimized
        />
      </div>
    );
    return branding.hero_imagem_link ? (
      <Link href={branding.hero_imagem_link} aria-label={branding.nome_loja}>
        {conteudo}
      </Link>
    ) : (
      conteudo
    );
  }

  const temFoto = branding.hero_modo === "foto" && imagem;

  const Textos = (
    <div className={temFoto ? "text-white" : ""}>
      {branding.hero_badge && (
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
            temFoto ? "bg-white/90 text-brand-sea" : "bg-white text-brand-sea"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-coral" />
          {branding.hero_badge}
        </span>
      )}
      {branding.hero_titulo && (
        <h1
          className={`mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl ${
            temFoto ? "text-white drop-shadow" : "text-brand-ink"
          }`}
        >
          {branding.hero_titulo}
        </h1>
      )}
      {branding.hero_subtitulo && (
        <p
          className={`mt-5 max-w-md text-base leading-relaxed ${
            temFoto ? "text-white/90" : "text-gray-600"
          }`}
        >
          {branding.hero_subtitulo}
        </p>
      )}
      {branding.hero_cta_texto && (
        <div className="mt-8">
          <Link
            href={branding.hero_cta_link || "/produtos"}
            className="inline-block rounded-full bg-brand-coral px-8 py-3.5 font-medium text-white shadow-lg shadow-brand-coral/20 transition hover:opacity-90"
          >
            {branding.hero_cta_texto}
          </Link>
        </div>
      )}
    </div>
  );

  // --- Modo FOTO: imagem de fundo + textos por cima ---
  if (temFoto) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative min-h-[420px] w-full md:min-h-[520px]">
          <Image
            src={imagem}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
          {/* Camada escura para dar contraste aos textos. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="relative mx-auto flex max-w-6xl items-center px-4 py-20">
            {Textos}
          </div>
        </div>
      </section>
    );
  }

  // --- Modo TEXTO: só os textos, sobre a areia ---
  return (
    <section className="bg-brand-sand">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">{Textos}</div>
    </section>
  );
}
