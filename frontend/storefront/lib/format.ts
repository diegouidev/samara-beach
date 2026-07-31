/** Helpers de formatação. */

export function formatBRL(valor: number | string): string {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

/** Resolve o caminho de imagem do backend (media/) para URL absoluta. */
export function resolveImagem(
  caminho: string | null,
  urlExterna?: string | null,
): string | null {
  if (urlExterna) return urlExterna;
  if (!caminho) return null;
  if (caminho.startsWith("http")) return caminho;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${base}${caminho.startsWith("/") ? "" : "/"}${caminho}`;
}
