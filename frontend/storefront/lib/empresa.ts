/**
 * Dados públicos da empresa (rodapé da loja).
 *
 * CNPJ e razão social precisam estar visíveis ao consumidor em venda online
 * (Decreto 7.962/2013, art. 2º). O endpoint é público e devolve só o que pode
 * ser exposto — os dados fiscais completos ficam no painel.
 */
import { API_URL } from "./api";

export interface EmpresaPublica {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  endereco_linha: string;
  cidade: string;
  uf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  horario_funcionamento: string;
}

/** Sem empresa cadastrada a loja continua de pé — o rodapé só omite o bloco. */
export async function getEmpresa(
  revalidate = 300,
): Promise<EmpresaPublica | null> {
  try {
    const res = await fetch(`${API_URL}/api/empresa/publica/`, {
      next: { revalidate },
      signal:
        typeof window === "undefined" ? AbortSignal.timeout(4000) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as EmpresaPublica;
  } catch {
    return null;
  }
}

export const URL_REDE = {
  instagram: (u: string) => `https://instagram.com/${u}`,
  facebook: (u: string) => `https://facebook.com/${u}`,
  tiktok: (u: string) => `https://tiktok.com/@${u}`,
} as const;
