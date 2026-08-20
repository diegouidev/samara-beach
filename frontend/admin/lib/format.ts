export function formatBRL(valor: number | string): string {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Data + hora — na auditoria a ordem dos fatos importa. */
export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export const STATUS_PEDIDO_LABEL: Record<string, string> = {
  carrinho: "Carrinho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAPEL_LABEL: Record<string, string> = {
  admin: "Administrador",
  estoque: "Estoque",
  financeiro: "Financeiro",
  atendimento: "Atendimento",
};
