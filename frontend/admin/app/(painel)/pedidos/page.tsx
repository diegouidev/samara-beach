"use client";

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { Alerta, Badge, Button, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
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

const STATUS_OPCOES: StatusPedido[] = [
  "aguardando_pagamento",
  "pago",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
];

function PedidosContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [status, setStatus] = useState("");
  const [canal, setCanal] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (buscaAplicada) p.search = buscaAplicada;
    if (status) p.status = status;
    if (canal) p.canal = canal;
    return p;
  }, [buscaAplicada, status, canal]);

  function carregar() {
    setCarregando(true);
    api
      .listarPedidos(params)
      .then((p) => setPedidos(p.filter((x) => x.status !== "carrinho")))
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setCarregando(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [params]);

  async function mudar(id: string, novo: StatusPedido) {
    await api.mudarStatusPedido(id, novo);
    carregar();
  }

  const temFiltro = Boolean(buscaAplicada || status || canal);

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Acompanhe e atualize o status" />

      {erro && (
        <Alerta tone="erro">{erro}</Alerta>
      )}

      {/* Busca e filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBuscaAplicada(busca.trim());
          }}
          className="flex-1"
        >
          <input
            className={inputClass}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, e-mail, telefone ou nº do pedido…"
          />
        </form>
        <select
          className={`${inputClass} sm:w-52`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s}>
              {STATUS_PEDIDO_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} sm:w-44`}
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
        >
          <option value="">Todos os canais</option>
          <option value="online">Online</option>
          <option value="presencial">Loja física</option>
        </select>
        {temFiltro && (
          <Button
            variant="ghost"
            onClick={() => {
              setBusca("");
              setBuscaAplicada("");
              setStatus("");
              setCanal("");
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : pedidos.length === 0 ? (
          <EmptyState
            titulo={
              temFiltro
                ? "Nenhum pedido encontrado para os filtros."
                : "Nenhum pedido ainda."
            }
          />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
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
                    <div className="text-sm font-medium text-panel-ink">
                      {p.cliente_nome ?? "—"}
                    </div>
                    {p.cliente_email && (
                      <div className="text-xs text-panel-inkMuted">
                        {p.cliente_email}
                      </div>
                    )}
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
