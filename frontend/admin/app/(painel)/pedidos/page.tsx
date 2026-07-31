"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { STATUS_PEDIDO_LABEL, formatBRL, formatData } from "@/lib/format";
import type { Pedido, StatusPedido } from "@/lib/types";

const PROXIMO_STATUS: Record<string, StatusPedido[]> = {
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["em_separacao", "cancelado"],
  em_separacao: ["enviado"],
  enviado: ["entregue"],
};

const TONE: Record<string, "neutral" | "amber" | "green" | "blue" | "red"> = {
  carrinho: "neutral",
  aguardando_pagamento: "amber",
  pago: "blue",
  em_separacao: "blue",
  enviado: "blue",
  entregue: "green",
  cancelado: "red",
};

export default function PedidosPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <PedidosContent />
    </RequireAuth>
  );
}

function PedidosContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    api
      .listarPedidos()
      .then((p) => setPedidos(p.filter((x) => x.status !== "carrinho")))
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function mudar(id: string, status: StatusPedido) {
    await api.mudarStatusPedido(id, status);
    carregar();
  }

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Acompanhe e atualize o status" />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <Card className="p-0">
        {carregando ? (
          <p className="p-6 text-sm text-slate-400">Carregando…</p>
        ) : pedidos.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Nenhum pedido ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-panel-border text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">Pedido</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Itens</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-panel-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">
                    #{p.id.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3">{formatData(p.created_at)}</td>
                  <td className="px-5 py-3">{p.itens.length}</td>
                  <td className="px-5 py-3 font-medium">{formatBRL(p.total)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={TONE[p.status]}>
                      {STATUS_PEDIDO_LABEL[p.status]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(PROXIMO_STATUS[p.status] ?? []).map((s) => (
                        <button
                          key={s}
                          onClick={() => mudar(p.id, s)}
                          className="rounded-md border border-panel-accent px-2 py-1 text-xs text-panel-accent hover:bg-cyan-50"
                        >
                          → {STATUS_PEDIDO_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
