"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { Alerta, Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import {
  IconeAlerta,
  IconeFinanceiro,
  IconeMargem,
  IconePedido,
} from "@/components/ui/icons";
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
        <Alerta tone="erro">{erro}</Alerta>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Pedidos confirmados"
          value={String(data?.num_pedidos ?? "—")}
          icon={<IconePedido className="h-[18px] w-[18px]" />}
          tone="accent"
        />
        <Stat
          label="Faturamento"
          value={data ? formatBRL(data.faturamento) : "—"}
          icon={<IconeFinanceiro className="h-[18px] w-[18px]" />}
          tone="positivo"
        />
        <Stat
          label="Ticket médio"
          value={data ? formatBRL(data.ticket_medio) : "—"}
          icon={<IconeMargem className="h-[18px] w-[18px]" />}
        />
        <Stat
          label="SKUs em alerta"
          value={String(baixo.length)}
          hint={baixo.length > 0 ? "abaixo do estoque mínimo" : "estoque saudável"}
          icon={<IconeAlerta className="h-[18px] w-[18px]" />}
          tone={baixo.length > 0 ? "atencao" : "neutral"}
        />
      </div>

      {data?.por_canal && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["online", "Loja online"],
              ["presencial", "Loja física"],
            ] as const
          ).map(([canal, label]) => {
            const t = data.por_canal[canal];
            const fatia =
              data.faturamento > 0
                ? Math.round(((t?.faturamento ?? 0) / data.faturamento) * 100)
                : 0;
            return (
              <Card key={canal}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-panel-inkSoft">
                    {label}
                  </p>
                  <span className="text-xs text-panel-inkMuted">
                    {fatia}% do total
                  </span>
                </div>
                <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-panel-ink">
                  {formatBRL(t?.faturamento ?? 0)}
                </p>
                {/* Barra de participação do canal no faturamento. */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-panel-accent transition-all"
                    style={{ width: `${fatia}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-panel-inkMuted">
                  {t?.num_pedidos ?? 0} pedido(s) · ticket{" "}
                  {formatBRL(t?.ticket_medio ?? 0)}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Produtos mais vendidos" bare>
          {data && data.produtos_mais_vendidos.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {data.produtos_mais_vendidos.map((p, i) => (
                <li
                  key={p.sku}
                  className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-panel-surfaceMuted"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold text-panel-inkMuted">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-panel-ink">
                      {p.produto}
                    </span>
                    <span className="block truncate text-xs text-panel-inkMuted">
                      {p.sku}
                    </span>
                  </span>
                  <span className="tabular whitespace-nowrap text-right">
                    <span className="block font-medium text-panel-ink">
                      {formatBRL(p.receita)}
                    </span>
                    <span className="block text-xs text-panel-inkMuted">
                      {p.quantidade} un
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              titulo="Nenhuma venda no período"
              descricao="Assim que houver vendas confirmadas, o ranking aparece aqui."
            />
          )}
        </Card>

        <Card title="Estoque baixo" bare>
          {baixo.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {baixo.map((item) => (
                <li
                  key={item.variacao}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition hover:bg-panel-surfaceMuted"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-panel-ink">
                      {item.produto}
                    </span>
                    <span className="block truncate text-xs text-panel-inkMuted">
                      {item.sku}
                    </span>
                  </span>
                  <Badge tone={item.saldo <= 0 ? "red" : "amber"} dot>
                    {item.saldo} / mín {item.estoque_minimo}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              titulo="Estoque saudável"
              descricao="Nenhum SKU abaixo do mínimo configurado."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
