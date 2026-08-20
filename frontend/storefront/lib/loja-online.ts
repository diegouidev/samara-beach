import { API_URL } from "./api";

/**
 * A loja online está ligada? (kill switch `LOJA_ONLINE_ATIVA` no backend.)
 *
 * Lê a API sem cache de propósito: um kill switch precisa valer na hora, e
 * uma resposta cacheada manteria a loja no ar (ou fora dele) por até uma
 * janela inteira de ISR depois da mudança. É um fetch minúsculo, e só ele
 * fica sem cache — o resto do branding continua com `revalidate`.
 *
 * Falha de rede devolve `false`: sem API não há como vender de qualquer
 * forma, e a página institucional é melhor que uma vitrine quebrada.
 */
export async function lojaOnlineAtiva(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/branding/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const dados = (await res.json()) as { loja_online_ativa?: boolean };
    return dados.loja_online_ativa !== false;
  } catch {
    return false;
  }
}
