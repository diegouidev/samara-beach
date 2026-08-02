"use client";

import { use, useEffect, useState } from "react";
import * as api from "@/lib/api";
import { getBranding, type Branding } from "@/lib/branding";
import { formatBRL } from "@/lib/format";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { VendaPDV } from "@/lib/types";

const METODO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  pix: "PIX",
};

/**
 * Recibo NÃO FISCAL da venda de balcão.
 * Fica fora do layout do painel para imprimir sem a barra lateral.
 */
export default function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <Recibo id={id} />
    </RequireAuth>
  );
}

function Recibo({ id }: { id: string }) {
  const [venda, setVenda] = useState<VendaPDV | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .buscarVenda(id)
      .then(setVenda)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"));
    getBranding(0).then(setBranding).catch(() => setBranding(null));
  }, [id]);

  if (erro) return <p className="p-8 text-red-600">{erro}</p>;
  if (!venda) return <p className="p-8 text-slate-400">Carregando…</p>;

  const troco = venda.pagamentos.reduce(
    (acc, p) => acc + Number(p.troco ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-sm bg-white p-6 text-sm text-slate-800">
      {/* Some na impressão */}
      <div className="mb-4 flex gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          Fechar
        </button>
      </div>

      <header className="border-b border-dashed border-slate-300 pb-3 text-center">
        <p className="text-lg font-bold">
          {branding?.nome_loja ?? "Samara Beach"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {new Date(venda.created_at).toLocaleString("pt-BR")}
        </p>
        <p className="text-xs text-slate-500">
          Pedido #{venda.id.slice(0, 8).toUpperCase()}
        </p>
      </header>

      <section className="border-b border-dashed border-slate-300 py-2 text-xs">
        <p>Cliente: {venda.cliente_nome || "Consumidor final"}</p>
        {venda.vendedor_nome && <p>Atendente: {venda.vendedor_nome}</p>}
      </section>

      <table className="w-full border-b border-dashed border-slate-300 py-2 text-xs">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qtd</th>
            <th className="py-1 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {venda.itens.map((item) => (
            <tr key={item.id}>
              <td className="py-1">
                {item.produto_nome}
                <span className="block text-[10px] text-slate-400">
                  {item.sku}
                </span>
              </td>
              <td className="py-1 text-center">{item.quantidade}</td>
              <td className="py-1 text-right">{formatBRL(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="border-b border-dashed border-slate-300 py-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatBRL(venda.subtotal)}</span>
        </div>
        {Number(venda.desconto) > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>− {formatBRL(venda.desconto)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{formatBRL(venda.total)}</span>
        </div>
      </section>

      <section className="py-2 text-xs">
        {venda.pagamentos.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span>
              {METODO_LABEL[p.metodo] ?? p.metodo}
              {p.parcelas > 1 && ` ${p.parcelas}x`}
            </span>
            <span>{formatBRL(p.valor)}</span>
          </div>
        ))}
        {troco > 0 && (
          <div className="mt-1 flex justify-between font-medium">
            <span>Troco</span>
            <span>{formatBRL(troco)}</span>
          </div>
        )}
      </section>

      <footer className="border-t border-dashed border-slate-300 pt-3 text-center text-[10px] text-slate-500">
        <p className="font-medium">DOCUMENTO NÃO FISCAL</p>
        <p className="mt-1">Obrigado pela preferência!</p>
        <p>Trocas em até 30 dias com este recibo.</p>
      </footer>
    </div>
  );
}
