"use client";

import { use, useEffect, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL, formatData } from "@/lib/format";
import { getEmpresa } from "@/lib/api";
import type { Empresa } from "@/lib/empresa";
import type { Pedido } from "@/lib/types";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function SeparacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAuth papeis={["admin", "atendimento", "estoque"]}>
      <Comanda id={id} />
    </RequireAuth>
  );
}

/**
 * Folha de separação: o que tirar da prateleira e para onde vai.
 *
 * Impressa em A4 e usada de mão em mão no estoque, então o SKU e a
 * quantidade vêm grandes — quem confere está em pé, com a folha na mão.
 */
function Comanda({ id }: { id: string }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .buscarPedido(id)
      .then(setPedido)
      .catch((e) =>
        setErro(e instanceof Error ? e.message : "Pedido não encontrado."),
      );
    getEmpresa()
      .then(setEmpresa)
      .catch(() => setEmpresa(null));
  }, [id]);

  if (erro) return <p className="p-8 text-red-600">{erro}</p>;
  if (!pedido) return <p className="p-8 text-slate-400">Carregando…</p>;

  const totalPecas = pedido.itens.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-slate-900">
      {/* Some na impressão */}
      <div className="mb-6 flex gap-2 print:hidden">
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

      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
        <div>
          <p className="text-2xl font-bold">Separação</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {empresa?.nome_fantasia || "Samara Beach"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-bold">
            #{pedido.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-sm text-slate-600">
            {formatData(pedido.created_at)}
          </p>
        </div>
      </header>

      <section className="grid gap-4 border-b border-slate-300 py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cliente
          </p>
          <p className="mt-0.5 font-medium">
            {pedido.cliente_nome || "Consumidor final"}
          </p>
          {pedido.cliente_telefone && (
            <p className="text-sm text-slate-600">{pedido.cliente_telefone}</p>
          )}
          {pedido.cliente_email && (
            <p className="text-sm text-slate-600">{pedido.cliente_email}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Canal
          </p>
          <p className="mt-0.5 font-medium">
            {pedido.canal === "presencial" ? "Loja física" : "Loja online"}
          </p>
          <p className="text-sm text-slate-600">
            {totalPecas} {totalPecas === 1 ? "peça" : "peças"} ·{" "}
            {pedido.itens.length}{" "}
            {pedido.itens.length === 1 ? "item" : "itens"}
          </p>
        </div>
      </section>

      {/* Caixa de conferência por item: quem separa risca a mão. */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="w-10 py-2">✓</th>
            <th className="py-2">Item</th>
            <th className="w-16 py-2 text-right">Qtd</th>
          </tr>
        </thead>
        <tbody>
          {pedido.itens.map((item) => (
            <tr key={item.id} className="border-b border-slate-200">
              <td className="py-3">
                <span className="block h-6 w-6 rounded border-2 border-slate-400" />
              </td>
              <td className="py-3">
                <p className="font-medium">{item.produto_nome}</p>
                <p className="font-mono text-sm text-slate-600">{item.sku}</p>
              </td>
              <td className="py-3 text-right text-xl font-bold tabular-nums">
                {item.quantidade}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-6 flex items-start justify-between gap-6 border-t-2 border-slate-900 pt-4">
        <div className="text-sm text-slate-600">
          <p>Separado por: ______________________</p>
          <p className="mt-3">Conferido por: _____________________</p>
        </div>
        <p className="text-right text-lg font-bold tabular-nums">
          {formatBRL(pedido.total)}
        </p>
      </footer>
    </div>
  );
}
