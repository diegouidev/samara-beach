/**
 * Branding (identidade visual) vindo da API. Aplicado em runtime via CSS variables.
 */
import { API_URL } from "./api";

export interface Branding {
  nome_loja: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_fundo: string;
  cor_texto: string;
  logo: string | null;
  favicon: string | null;
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
