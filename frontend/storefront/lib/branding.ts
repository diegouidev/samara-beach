/**
 * Branding (identidade visual) vindo da API. Aplicado em runtime via CSS variables.
 */
import { API_URL } from "./api";

export type HeroModo = "texto" | "foto" | "banner";

export interface Branding {
  nome_loja: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_fundo: string;
  cor_texto: string;
  logo: string | null;
  favicon: string | null;
  /** Número com DDI+DDD usado no checkout e no botão flutuante. */
  whatsapp: string;
  // --- Hero (topo da home) ---
  hero_modo: HeroModo;
  hero_imagem: string | null;
  hero_imagem_link: string;
  hero_badge: string;
  hero_titulo: string;
  hero_subtitulo: string;
  hero_cta_texto: string;
  hero_cta_link: string;
  updated_at?: string;
}

export const BRANDING_FALLBACK: Branding = {
  nome_loja: "Samara Beach",
  cor_primaria: "#0891b2",
  cor_secundaria: "#0e7490",
  cor_destaque: "#fb7185",
  cor_fundo: "#f5efe6",
  cor_texto: "#1f2937",
  logo: null,
  favicon: null,
  whatsapp: "",
  hero_modo: "texto",
  hero_imagem: null,
  hero_imagem_link: "",
  hero_badge: "Nova coleção de verão",
  hero_titulo: "Moda praia que combina com o seu verão.",
  hero_subtitulo:
    "Biquínis, maiôs, saídas e acessórios — com produção própria e curadoria especial. Encontre o seu look à beira-mar.",
  hero_cta_texto: "Ver coleção",
  hero_cta_link: "/produtos",
};

/** Busca o branding (Server ou Client). Cai no fallback se a API falhar. */
export async function getBranding(revalidate = 60): Promise<Branding> {
  try {
    const res = await fetch(`${API_URL}/api/branding/`, {
      next: { revalidate },
      // Timeout curto: no build/SSR sem API, cai no fallback rápido (não trava o prerender).
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return BRANDING_FALLBACK;
    return (await res.json()) as Branding;
  } catch {
    return BRANDING_FALLBACK;
  }
}

/** Converte o branding em declarações de CSS variables para injeção no :root. */
export function brandingToCssVars(b: Branding): string {
  return [
    `--cor-primaria:${b.cor_primaria}`,
    `--cor-secundaria:${b.cor_secundaria}`,
    `--cor-destaque:${b.cor_destaque}`,
    `--cor-fundo:${b.cor_fundo}`,
    `--cor-texto:${b.cor_texto}`,
  ].join(";");
}
