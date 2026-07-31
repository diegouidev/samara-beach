"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/providers/AuthProvider";
import { sincronizarCarrinho } from "@/lib/api";
import { formatBRL } from "@/lib/format";

export default function CheckoutPage() {
  const { itens, subtotal, limpar } = useCart();
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  async function finalizar() {
    setErro(null);
    setEnviando(true);
    try {
      // Sincroniza o carrinho local com o carrinho do backend (exige login).
      const pedido = await sincronizarCarrinho(
        itens.map((i) => ({
          variacaoId: i.variacaoId,
          quantidade: i.quantidade,
        })),
      );
      setPedidoId(pedido.id);
      limpar();
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível finalizar o pedido.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (pedidoId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-ink">
          Pedido registrado! 🎉
        </h1>
        <p className="mt-3 text-gray-600">
          Seu pedido <span className="font-mono">{pedidoId.slice(0, 8)}</span>{" "}
          foi criado. O pagamento (Pix/cartão) e o cálculo de frete serão
          habilitados em breve — você acompanhará o status por aqui e por e-mail.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/conta/pedidos"
            className="rounded-full bg-brand-sea px-6 py-2 text-white hover:bg-brand-seaDark"
          >
            Ver meus pedidos
          </Link>
          <Link
            href="/produtos"
            className="rounded-full border border-brand-sea px-6 py-2 text-brand-sea"
          >
            Continuar comprando
          </Link>
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
          {/* Revisão do pedido */}
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
              <span>Subtotal</span>
              <span>{formatBRL(subtotal())}</span>
            </div>
          </section>

          {/* Pagamento/Frete — placeholder (stand-by no backend) */}
          <section className="rounded-2xl border border-dashed border-gray-200 bg-brand-sand/40 p-6">
            <h2 className="font-semibold text-brand-ink">
              Pagamento e frete
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Pagamento via <strong>Pix</strong> e <strong>cartão</strong>, e o
              cálculo de frete, estão em configuração e serão habilitados em
              breve. Por enquanto, você pode registrar o pedido e acompanhá-lo
              na sua conta.
            </p>
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

          {erro && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {erro}
            </p>
          )}

          <button
            onClick={finalizar}
            disabled={enviando || !usuario}
            className="w-full rounded-full bg-brand-coral py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Registrando..." : "Registrar pedido"}
          </button>
        </div>
      )}
    </div>
  );
}
