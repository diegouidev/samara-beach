"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { Card, PageHeader, Stat } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { DashboardData, EstoqueBaixoItem } from "@/lib/types";

export default function DashboardPage() {
  return (
    <RequireAuth papeis={["admin", "financeiro", "atendimento"]}>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [baixo, setBaixo] = useState<EstoqueBaixoItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"));
    // estoque baixo pode não estar acessível a financeiro; ignora erro.
    api
      .estoqueBaixo()
      .then((r) => setBaixo(r.results))
      .catch(() => setBaixo([]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral de vendas e estoque"
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pedidos (confirmados)"
          value={String(data?.num_pedidos ?? "—")}
        />
        <Stat
          label="Faturamento"
          value={data ? formatBRL(data.faturamento) : "—"}
        />
        <Stat
          label="Ticket médio"
          value={data ? formatBRL(data.ticket_medio) : "—"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">
            Produtos mais vendidos
          </h2>
          {data && data.produtos_mais_vendidos.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {data.produtos_mais_vendidos.map((p) => (
                <li
                  key={p.sku}
                  className="flex justify-between py-2 text-sm"
                >
                  <span>
                    {p.produto}{" "}
                    <span className="text-slate-400">({p.sku})</span>
                  </span>
                  <span className="font-medium">
                    {p.quantidade} un · {formatBRL(p.receita)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              Ainda não há vendas confirmadas no período.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">
            Alertas de estoque baixo
          </h2>
          {baixo.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {baixo.map((item) => (
                <li
                  key={item.variacao}
                  className="flex justify-between py-2 text-sm"
                >
                  <span>
                    {item.produto}{" "}
                    <span className="text-slate-400">({item.sku})</span>
                  </span>
                  <span className="font-medium text-amber-600">
                    saldo {item.saldo} / mín {item.estoque_minimo}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              Nenhum SKU abaixo do estoque mínimo. 🎉
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
