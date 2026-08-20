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
  // Pedidos com os itens à mostra. Quem separa precisa ver o que vai na
  // sacola sem trocar de tela.
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function alternar(id: string) {
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

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
              {pedidos.flatMap((p) => [
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
                  <td>
                    <button
                      onClick={() => alternar(p.id)}
                      aria-expanded={abertos.has(p.id)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-panel-inkSoft transition hover:bg-panel-surfaceMuted hover:text-panel-ink"
                    >
                      {p.itens.length}
                      <span
                        aria-hidden="true"
                        className={`text-[10px] transition-transform ${
                          abertos.has(p.id) ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>
                  </td>
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
                </tr>,
                abertos.has(p.id) && (
                  <tr key={`${p.id}-itens`} className="bg-panel-surfaceMuted/60">
                    <td colSpan={8} className="px-5 py-4">
                      <ItensDoPedido pedido={p} />
                    </td>
                  </tr>
                ),
              ])}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}


/**
 * Itens de um pedido, para separação. SKU em destaque porque é o que se
 * procura na prateleira — e o subtotal fecha com o total da linha de cima.
 */
function ItensDoPedido({ pedido }: { pedido: Pedido }) {
  if (pedido.itens.length === 0) {
    return (
      <p className="text-sm text-panel-inkMuted">Este pedido não tem itens.</p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-panel-border overflow-hidden rounded-xl border border-panel-border bg-panel-surface">
        {pedido.itens.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
          >
            <span className="flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-panel-accent/10 px-2 text-sm font-semibold tabular-nums text-panel-accent">
              {item.quantidade}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-panel-ink">
                {item.produto_nome}
              </span>
              <span className="block font-mono text-xs text-panel-inkMuted">
                {item.sku}
              </span>
            </span>
            <span className="text-right text-sm tabular-nums text-panel-inkSoft">
              {formatBRL(item.preco_unitario)}
              {item.quantidade > 1 && (
                <span className="block text-xs text-panel-inkMuted">cada</span>
              )}
            </span>
            <span className="w-24 text-right text-sm font-medium tabular-nums text-panel-ink">
              {formatBRL(item.subtotal)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <a
          href={`/admin/separacao/${pedido.id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-panel-borderStrong px-3 py-1.5 text-xs font-medium text-panel-inkSoft transition hover:border-panel-accent hover:text-panel-accent"
        >
          Imprimir separação ↗
        </a>
        <span className="text-panel-inkMuted">
          {pedido.cupom_codigo && (
            <>
              Cupom <span className="font-mono">{pedido.cupom_codigo}</span> ·{" "}
            </>
          )}
          {Number(pedido.desconto) > 0 && (
            <>Desconto de {formatBRL(pedido.desconto)} · </>
          )}
          {Number(pedido.frete) > 0 && <>Frete {formatBRL(pedido.frete)}</>}
        </span>
        <span className="font-semibold tabular-nums text-panel-ink">
          Total {formatBRL(pedido.total)}
        </span>
      </div>
    </div>
  );
}
