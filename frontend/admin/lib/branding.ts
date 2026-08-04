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
  hero_modo: "foto",
  hero_imagem: null,
  hero_imagem_link: "",
  hero_badge: "Nova coleção de verão",
  hero_titulo: "Moda praia que combina com o seu verão.",
  hero_subtitulo:
    "Biquínis, maiôs, saídas e acessórios — com produção própria e curadoria especial. Encontre o seu look à beira-mar.",
  hero_cta_texto: "Ver coleção",
  hero_cta_link: "/produtos",
};

export async function getBranding(revalidate = 60): Promise<Branding> {
  try {
    const res = await fetch(`${API_URL}/api/branding/`, {
      next: { revalidate },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return BRANDING_FALLBACK;
    return (await res.json()) as Branding;
  } catch {
    return BRANDING_FALLBACK;
  }
}

export function brandingToCssVars(b: Branding): string {
  return [
    `--cor-primaria:${b.cor_primaria}`,
    `--cor-secundaria:${b.cor_secundaria}`,
    `--cor-destaque:${b.cor_destaque}`,
    `--cor-fundo:${b.cor_fundo}`,
    `--cor-texto:${b.cor_texto}`,
  ].join(";");
}

// --- Edição (usada pela aba Personalização; requer admin) ---

export async function atualizarBranding(
  form: FormData,
): Promise<Branding> {
  const { tokenStore } = await import("./api");
  const res = await fetch(`${API_URL}/api/branding/`, {
    method: "PATCH",
    headers: tokenStore.access
      ? { Authorization: `Bearer ${tokenStore.access}` }
      : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao salvar branding.");
  }
  return (await res.json()) as Branding;
}
