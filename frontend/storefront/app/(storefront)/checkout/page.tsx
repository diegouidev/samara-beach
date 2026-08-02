"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/providers/AuthProvider";
import { finalizarPedido, sincronizarCarrinho } from "@/lib/api";
import { getBranding, type Branding } from "@/lib/branding";
import { formatBRL } from "@/lib/format";
import { linkWhatsApp, mensagemPedido } from "@/lib/whatsapp";

function IconeWhatsApp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 5 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3Z" />
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

export default function CheckoutPage() {
  const { itens, subtotal, limpar } = useCart();
  const { usuario, carregando } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [concluido, setConcluido] = useState<{
    pedidoId: string;
    link: string;
  } | null>(null);

  useEffect(() => {
    getBranding(0)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, []);

  const whatsapp = branding?.whatsapp ?? "";

  async function finalizar() {
    setErro(null);
    setEnviando(true);
    try {
      // 1. Sobe o carrinho local para o backend (exige login).
      const pedido = await sincronizarCarrinho(
        itens.map((i) => ({
          variacaoId: i.variacaoId,
          quantidade: i.quantidade,
        })),
      );
      // 2. Fecha o pedido: ele ganha número e passa a aguardar pagamento.
      const finalizado = await finalizarPedido(pedido.id);

      const mensagem = mensagemPedido({
        pedidoId: finalizado.id,
        itens,
        total: Number(finalizado.total) || subtotal(),
        nomeCliente: usuario?.first_name || undefined,
        nomeLoja: branding?.nome_loja ?? "Samara Beach",
      });
      const link = linkWhatsApp(whatsapp, mensagem);

      setConcluido({ pedidoId: finalizado.id, link });
      limpar();
      // 3. Abre a conversa já com o pedido montado.
      window.open(link, "_blank", "noopener");
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível finalizar o pedido.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <IconeWhatsApp className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-brand-ink">
          Pedido registrado!
        </h1>
        <p className="mt-3 text-gray-600">
          Seu pedido{" "}
          <span className="font-mono font-medium">
            #{concluido.pedidoId.slice(0, 8).toUpperCase()}
          </span>{" "}
          foi criado. Combine a entrega e o pagamento com a gente pelo WhatsApp —
          se a conversa não abriu, use o botão abaixo.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href={concluido.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-3 font-medium text-white transition hover:opacity-90"
          >
            <IconeWhatsApp className="h-5 w-5" />
            Abrir conversa no WhatsApp
          </a>
          <div className="flex gap-4 text-sm">
            <Link href="/conta/pedidos" className="text-brand-sea hover:underline">
              Ver meus pedidos
            </Link>
            <Link href="/produtos" className="text-brand-sea hover:underline">
              Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-ink">Checkout</h1>

      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
          Seu carrinho está vazio.{" "}
          <Link href="/produtos" className="text-brand-sea hover:underline">
            Ver produtos
          </Link>
        </p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 p-6">
            <h2 className="mb-4 font-semibold">Resumo do pedido</h2>
            <ul className="divide-y divide-gray-100">
              {itens.map((i) => (
                <li
                  key={i.variacaoId}
                  className="flex justify-between py-2 text-sm"
                >
                  <span>
                    {i.quantidade}× {i.produtoNome}{" "}
                    <span className="text-gray-400">
                      ({[i.cor, i.tamanho].filter(Boolean).join("/")})
                    </span>
                  </span>
                  <span>{formatBRL(i.precoUnitario * i.quantidade)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 font-semibold">
              <span>Total</span>
              <span>{formatBRL(subtotal())}</span>
            </div>
          </section>

          {/* Como funciona — deixa claro que o fechamento é pelo WhatsApp. */}
          <section className="rounded-2xl border border-gray-100 bg-brand-sand/40 p-6">
            <h2 className="font-semibold text-brand-ink">
              Como finalizamos seu pedido
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <strong>1.</strong> Você registra o pedido aqui e ele ganha um
                número.
              </li>
              <li>
                <strong>2.</strong> A conversa abre no nosso WhatsApp já com os
                itens e o total.
              </li>
              <li>
                <strong>3.</strong> Combinamos a entrega e o pagamento (Pix,
                cartão ou dinheiro) por lá.
              </li>
            </ol>
          </section>

          {!carregando && !usuario && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Você precisa{" "}
              <Link href="/conta/login" className="font-medium underline">
                entrar na sua conta
              </Link>{" "}
              para finalizar o pedido.
            </p>
          )}

          {!whatsapp && branding && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              O WhatsApp da loja ainda não foi configurado. O pedido será
              registrado e nossa equipe entrará em contato.
            </p>
          )}

          {erro && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {erro}
            </p>
          )}

          <button
            onClick={finalizar}
            disabled={enviando || !usuario}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <IconeWhatsApp className="h-5 w-5" />
            {enviando ? "Registrando…" : "Finalizar pelo WhatsApp"}
          </button>
        </div>
      )}
    </div>
  );
}
