/** Monta o link e a mensagem do checkout no WhatsApp da loja. */
import { formatBRL } from "./format";
import type { LinhaCarrinho } from "./types";

export function linkWhatsApp(numero: string, mensagem: string): string {
  const limpo = (numero || "").replace(/\D/g, "");
  return `https://wa.me/${limpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Mensagem do pedido: número curto, itens e total.
 *
 * O número do pedido é o que amarra a conversa ao registro do painel — sem
 * ele, a loja não sabe qual pedido está sendo negociado.
 */
export function mensagemPedido({
  pedidoId,
  itens,
  total,
  nomeCliente,
  nomeLoja,
}: {
  pedidoId: string;
  itens: LinhaCarrinho[];
  total: number;
  nomeCliente?: string;
  nomeLoja: string;
}): string {
  const linhas = itens.map((i) => {
    const variacao = [i.cor, i.tamanho].filter(Boolean).join("/");
    return `• ${i.quantidade}x ${i.produtoNome}${variacao ? ` (${variacao})` : ""} — ${formatBRL(
      i.precoUnitario * i.quantidade,
    )}`;
  });

  return [
    `Olá, ${nomeLoja}! Quero finalizar meu pedido.`,
    "",
    `*Pedido:* #${pedidoId.slice(0, 8).toUpperCase()}`,
    nomeCliente ? `*Cliente:* ${nomeCliente}` : null,
    "",
    "*Itens:*",
    ...linhas,
    "",
    `*Total:* ${formatBRL(total)}`,
    "",
    "Podemos combinar a entrega e o pagamento?",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
