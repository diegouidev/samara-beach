"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Alerta, Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
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
        <Alerta tone="erro">{erro}</Alerta>
      )}

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : pedidos.length === 0 ? (
          <EmptyState titulo={"Nenhum pedido ainda."} />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Canal</th>
                <th>Data</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">
                    #{p.id.slice(0, 8)}
                  </td>
                  <td>
                    <Badge tone={p.canal === "presencial" ? "amber" : "neutral"}>
                      {p.canal === "presencial" ? "Loja física" : "Online"}
                    </Badge>
                  </td>
                  <td>{formatData(p.created_at)}</td>
                  <td>{p.itens.length}</td>
                  <td className="font-medium">{formatBRL(p.total)}</td>
                  <td>
                    <Badge tone={TONE[p.status]}>
                      {STATUS_PEDIDO_LABEL[p.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {(PROXIMO_STATUS[p.status] ?? []).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === "cancelado" ? "ghost" : "soft"}
                          onClick={() => mudar(p.id, s)}
                        >
                          {STATUS_PEDIDO_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
