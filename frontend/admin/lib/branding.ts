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
  /** Número com DDI+DDD usado no checkout e no botão flutuante. */
  whatsapp: string;
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
