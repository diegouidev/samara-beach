"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL, formatData } from "@/lib/format";
import {
  Alerta,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Stat,
  inputClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type {
  NomeRelatorio,
  RelatorioClientes,
  RelatorioFinanceiro,
  RelatorioProdutos,
  RelatorioVendas,
} from "@/lib/types";

const ABAS: { valor: NomeRelatorio; label: string }[] = [
  { valor: "vendas", label: "Vendas" },
  { valor: "produtos", label: "Produtos e estoque" },
  { valor: "clientes", label: "Clientes" },
  { valor: "financeiro", label: "Financeiro e caixa" },
];

const METODO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "PIX",
  credito_troca: "Crédito de troca",
  cartao: "Cartão",
  boleto: "Boleto",
};

function ultimos30() {
  const hoje = new Date();
  const antes = new Date();
  antes.setDate(hoje.getDate() - 29);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: iso(antes), fim: iso(hoje) };
}

export default function RelatoriosPage() {
  return (
    <RequireAuth papeis={["admin", "financeiro", "atendimento"]}>
      <RelatoriosContent />
    </RequireAuth>
  );
}

function RelatoriosContent() {
  const [aba, setAba] = useState<NomeRelatorio>("vendas");
  const [periodo, setPeriodo] = useState(ultimos30);
  /**
   * Guarda a aba junto com o conteúdo: cada relatório tem um formato próprio,
   * então renderizar os dados de "vendas" dentro da aba "produtos" quebra a
   * tela. Só desenha quando o que está carregado é da aba atual.
   */
  const [resultado, setResultado] = useState<{
    aba: NomeRelatorio;
    conteudo: unknown;
  } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Descarta a resposta se a pessoa trocar de aba antes de ela chegar.
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setResultado(null);

    api
      .relatorio<unknown>(aba, periodo)
      .then((conteudo) => {
        if (!cancelado) setResultado({ aba, conteudo });
      })
      .catch((e) => {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : "Erro ao carregar.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [aba, periodo]);

  const dados = resultado?.aba === aba ? resultado.conteudo : null;

  const baixar = useCallback(
    async (bloco: string) => {
      try {
        await api.baixarRelatorioCSV(aba, bloco, periodo);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao baixar.");
      }
    },
    [aba, periodo],
  );

  function atalho(dias: number) {
    const hoje = new Date();
    const antes = new Date();
    antes.setDate(hoje.getDate() - (dias - 1));
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    setPeriodo({ inicio: iso(antes), fim: iso(hoje) });
  }

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Vendas, produtos, clientes e financeiro no período escolhido"
      />

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            onClick={() => setAba(a.valor)}
            className={`rounded-lg px-4 py-1.5 transition ${
              aba === a.valor
                ? "bg-panel-surface font-medium text-panel-ink shadow-card"
                : "text-panel-inkMuted hover:text-panel-ink"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="De">
            <input
              className={inputClass}
              type="date"
              value={periodo.inicio}
              onChange={(e) =>
                setPeriodo((p) => ({ ...p, inicio: e.target.value }))
              }
            />
          </Field>
          <Field label="Até">
            <input
              className={inputClass}
              type="date"
              value={periodo.fim}
              onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
            />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => atalho(7)}>
              7 dias
            </Button>
            <Button size="sm" variant="outline" onClick={() => atalho(30)}>
              30 dias
            </Button>
            <Button size="sm" variant="outline" onClick={() => atalho(90)}>
              90 dias
            </Button>
          </div>
        </div>
      </Card>

      {erro && <Alerta tone="erro">{erro}</Alerta>}

      {carregando || !dados ? (
        <Card>
          <EmptyState titulo={erro ? "Não foi possível carregar" : "Carregando…"} />
        </Card>
      ) : (
        <>
          {aba === "vendas" && (
            <AbaVendas dados={dados as RelatorioVendas} onBaixar={baixar} />
          )}
          {aba === "produtos" && (
            <AbaProdutos dados={dados as RelatorioProdutos} onBaixar={baixar} />
          )}
          {aba === "clientes" && (
            <AbaClientes dados={dados as RelatorioClientes} onBaixar={baixar} />
          )}
          {aba === "financeiro" && (
            <AbaFinanceiro
              dados={dados as RelatorioFinanceiro}
              onBaixar={baixar}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Cabeçalho de bloco com o botão de exportar. */
function BotaoCSV({ bloco, onBaixar }: { bloco: string; onBaixar: (b: string) => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={() => onBaixar(bloco)}>
      Baixar CSV
    </Button>
  );
}

/** Barra proporcional — leitura rápida de participação sem lib de gráfico. */
function Barra({ valor, maximo }: { valor: number; maximo: number }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-panel-accent"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AbaVendas({
  dados,
  onBaixar,
}: {
  dados: RelatorioVendas;
  onBaixar: (b: string) => void;
}) {
  if (!dados) return null;
  const porDia = dados.por_dia ?? [];
  const maxDia = Math.max(...porDia.map((d) => Number(d.total)), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Vendas" value={String(dados.total_pedidos)} />
        <Stat label="Faturamento" value={formatBRL(dados.total_vendido)} tone="positivo" />
        <Stat label="Ticket médio" value={formatBRL(dados.ticket_medio)} />
        <Stat
          label="Peças vendidas"
          value={String(dados.pecas_vendidas)}
          hint={`${dados.pecas_por_venda} por venda`}
        />
      </div>

      <Card title="Vendas por dia" action={<BotaoCSV bloco="por_dia" onBaixar={onBaixar} />} bare>
        {porDia.length === 0 ? (
          <EmptyState titulo="Nenhuma venda no período" />
        ) : (
          <ul className="divide-y divide-panel-border">
            {porDia.map((d) => (
              <li key={d.data} className="px-5 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-panel-inkSoft">{formatData(d.data)}</span>
                  <span className="tabular font-medium text-panel-ink">
                    {formatBRL(d.total)}
                    <span className="ml-2 text-xs font-normal text-panel-inkMuted">
                      {d.pedidos} venda(s)
                    </span>
                  </span>
                </div>
                <div className="mt-2">
                  <Barra valor={Number(d.total)} maximo={maxDia} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Por canal" action={<BotaoCSV bloco="por_canal" onBaixar={onBaixar} />} bare>
          <TabelaSimples
            colunas={["Canal", "Vendas", "Total"]}
            linhas={(dados.por_canal ?? []).map((c) => [
              c.canal === "presencial" ? "Loja física" : "Loja online",
              String(c.pedidos),
              formatBRL(c.total),
            ])}
          />
        </Card>

        <Card
          title="Por vendedor"
          action={<BotaoCSV bloco="por_vendedor" onBaixar={onBaixar} />}
          bare
        >
          <TabelaSimples
            colunas={["Vendedor", "Vendas", "Total"]}
            linhas={(dados.por_vendedor ?? []).map((v) => [
              v.vendedor,
              String(v.pedidos),
              formatBRL(v.total),
            ])}
          />
        </Card>

        <Card
          title="Formas de pagamento"
          action={<BotaoCSV bloco="por_pagamento" onBaixar={onBaixar} />}
          bare
        >
          <TabelaSimples
            colunas={["Forma", "Transações", "Total"]}
            linhas={(dados.por_pagamento ?? []).map((p) => [
              METODO_LABEL[p.metodo] ?? p.metodo,
              String(p.transacoes),
              formatBRL(p.total),
            ])}
          />
        </Card>
      </div>
    </div>
  );
}

function AbaProdutos({
  dados,
  onBaixar,
}: {
  dados: RelatorioProdutos;
  onBaixar: (b: string) => void;
}) {
  if (!dados) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="SKUs vendidos" value={String(dados.skus_vendidos)} />
        <Stat label="Receita no período" value={formatBRL(dados.receita_total)} />
        <Stat
          label="Valor em estoque"
          value={formatBRL(dados.valor_em_estoque)}
          hint={`${dados.unidades_em_estoque} peça(s)`}
        />
        <Stat
          label="Estoque parado"
          value={formatBRL(dados.valor_parado)}
          hint="sem venda no período"
          tone={Number(dados.valor_parado) > 0 ? "atencao" : "neutral"}
        />
      </div>

      <Card
        title="Ranking de produtos"
        subtitle="Curva ABC: A concentra os primeiros 80% da receita"
        action={<BotaoCSV bloco="ranking" onBaixar={onBaixar} />}
        bare
      >
        {(dados.ranking ?? []).length === 0 ? (
          <EmptyState titulo="Nenhuma venda no período" />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Curva</th>
                <th className="text-right">Unid.</th>
                <th className="text-right">Receita</th>
                <th className="text-right">Margem</th>
                <th className="text-right">% receita</th>
              </tr>
            </thead>
            <tbody>
              {(dados.ranking ?? []).map((p) => (
                <tr key={p.sku}>
                  <td>
                    <span className="font-medium text-panel-ink">
                      {p.produto}
                    </span>
                    <span className="block font-mono text-xs text-panel-inkMuted">
                      {p.sku}
                    </span>
                  </td>
                  <td>
                    <Badge
                      tone={
                        p.curva === "A" ? "green" : p.curva === "B" ? "amber" : "neutral"
                      }
                    >
                      {p.curva}
                    </Badge>
                  </td>
                  <td className="tabular text-right">{p.unidades}</td>
                  <td className="tabular text-right font-medium text-panel-ink">
                    {formatBRL(p.receita)}
                  </td>
                  <td className="tabular text-right">
                    {p.custo_incompleto ? (
                      <span className="text-xs text-amber-600">sem custo</span>
                    ) : (
                      <>
                        {formatBRL(p.margem)}
                        <span className="block text-xs text-panel-inkMuted">
                          {p.margem_percentual}%
                        </span>
                      </>
                    )}
                  </td>
                  <td className="tabular text-right">{p.participacao}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <Card
        title="Estoque parado"
        subtitle="Com saldo e sem nenhuma venda no período"
        action={<BotaoCSV bloco="parados" onBaixar={onBaixar} />}
        bare
      >
        {(dados.parados ?? []).length === 0 ? (
          <EmptyState titulo="Tudo girou no período" />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="text-right">Saldo</th>
                <th className="text-right">Custo médio</th>
                <th className="text-right">Parado</th>
              </tr>
            </thead>
            <tbody>
              {(dados.parados ?? []).map((p) => (
                <tr key={p.sku}>
                  <td>
                    <span className="font-medium text-panel-ink">{p.produto}</span>
                    <span className="block font-mono text-xs text-panel-inkMuted">
                      {p.sku}
                    </span>
                  </td>
                  <td className="tabular text-right">{p.saldo}</td>
                  <td className="tabular text-right">{formatBRL(p.custo_medio)}</td>
                  <td className="tabular text-right font-medium">
                    {formatBRL(p.valor_parado)}
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

function AbaClientes({
  dados,
  onBaixar,
}: {
  dados: RelatorioClientes;
  onBaixar: (b: string) => void;
}) {
  if (!dados) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Clientes que compraram" value={String(dados.clientes_compraram)} />
        <Stat label="Novos no período" value={String(dados.clientes_novos)} tone="positivo" />
        <Stat
          label="Recorrentes"
          value={String(dados.clientes_recorrentes)}
          hint="compraram mais de uma vez"
        />
        <Stat
          label="Vendas sem identificação"
          value={String(dados.vendas_anonimas)}
          hint={`${dados.vendas_identificadas} identificada(s)`}
          tone={dados.vendas_anonimas > 0 ? "atencao" : "neutral"}
        />
      </div>

      <Card
        title="Melhores clientes"
        action={<BotaoCSV bloco="ranking" onBaixar={onBaixar} />}
        bare
      >
        {(dados.ranking ?? []).length === 0 ? (
          <EmptyState
            titulo="Nenhuma compra identificada"
            descricao="Identifique a cliente no PDV para alimentar este relatório."
          />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th className="text-right">Compras</th>
                <th className="text-right">Total gasto</th>
                <th className="text-right">Ticket médio</th>
                <th>Última compra</th>
              </tr>
            </thead>
            <tbody>
              {(dados.ranking ?? []).map((c) => (
                <tr key={`${c.cliente}-${c.contato}`}>
                  <td className="font-medium text-panel-ink">{c.cliente}</td>
                  <td className="text-xs">{c.contato || "—"}</td>
                  <td className="tabular text-right">{c.compras}</td>
                  <td className="tabular text-right font-medium text-panel-ink">
                    {formatBRL(c.gasto)}
                  </td>
                  <td className="tabular text-right">{formatBRL(c.ticket_medio)}</td>
                  <td>{c.ultima_compra ? formatData(c.ultima_compra) : "—"}</td>
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

function AbaFinanceiro({
  dados,
  onBaixar,
}: {
  dados: RelatorioFinanceiro;
  onBaixar: (b: string) => void;
}) {
  if (!dados) return null;
  const diferenca = Number(dados.diferenca_acumulada);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Entradas no caixa" value={formatBRL(dados.total_entradas)} tone="positivo" />
        <Stat label="Saídas" value={formatBRL(dados.total_saidas)} />
        <Stat
          label="Diferença de caixa"
          value={formatBRL(diferenca)}
          hint={`${dados.turnos_fechados} turno(s) fechado(s)`}
          tone={diferenca === 0 ? "neutral" : "atencao"}
        />
        <Stat label="Contas a vencer" value={formatBRL(dados.contas_a_vencer)} tone="atencao" />
      </div>

      <Card title="Fluxo de caixa" action={<BotaoCSV bloco="fluxo" onBaixar={onBaixar} />} bare>
        {(dados.fluxo ?? []).length === 0 ? (
          <EmptyState titulo="Nenhum movimento no período" />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Dia</th>
                <th className="text-right">Entradas</th>
                <th className="text-right">Saídas</th>
                <th className="text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {(dados.fluxo ?? []).map((f) => (
                <tr key={f.data}>
                  <td>{formatData(f.data)}</td>
                  <td className="tabular text-right text-emerald-600">
                    {formatBRL(f.entradas)}
                  </td>
                  <td className="tabular text-right text-red-500">
                    {formatBRL(f.saidas)}
                  </td>
                  <td className="tabular text-right font-medium text-panel-ink">
                    {formatBRL(f.liquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Turnos de caixa"
          action={<BotaoCSV bloco="turnos" onBaixar={onBaixar} />}
          bare
        >
          {(dados.turnos ?? []).length === 0 ? (
            <EmptyState titulo="Nenhum turno no período" />
          ) : (
            <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Abertura</th>
                  <th className="text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {(dados.turnos ?? []).map((t, i) => {
                  const dif = Number(t.diferenca ?? 0);
                  return (
                    <tr key={`${t.operador}-${i}`}>
                      <td className="text-xs">{t.operador}</td>
                      <td>{formatData(t.abertura)}</td>
                      <td className="text-right">
                        {t.status === "aberta" ? (
                          <Badge tone="blue" dot>
                            aberto
                          </Badge>
                        ) : (
                          <Badge tone={dif === 0 ? "green" : dif > 0 ? "amber" : "red"}>
                            {dif === 0 ? "confere" : formatBRL(dif)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </Card>

        <Card
          title="Contas a vencer"
          action={<BotaoCSV bloco="a_vencer" onBaixar={onBaixar} />}
          bare
        >
          {(dados.a_vencer ?? []).length === 0 ? (
            <EmptyState titulo="Nenhuma conta em aberto" />
          ) : (
            <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(dados.a_vencer ?? []).map((c, i) => (
                  <tr key={`${c.conta}-${i}`}>
                    <td>
                      <span className="font-medium text-panel-ink">{c.conta}</span>
                      <span className="block text-xs text-panel-inkMuted">
                        {c.categoria}
                      </span>
                    </td>
                    <td>
                      {formatData(c.vencimento)}
                      {c.situacao === "vencida" && (
                        <span className="block text-xs text-red-500">vencida</span>
                      )}
                    </td>
                    <td className="tabular text-right font-medium">
                      {formatBRL(c.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TabelaSimples({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: string[][];
}) {
  if (linhas.length === 0) {
    return <EmptyState titulo="Sem dados no período" />;
  }
  return (
    <div className="tabela-wrap">
    <table className="tabela">
      <thead>
        <tr>
          {colunas.map((c, i) => (
            <th key={c} className={i > 0 ? "text-right" : undefined}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, i) => (
          <tr key={i}>
            {linha.map((celula, j) => (
              <td
                key={j}
                className={
                  j === 0
                    ? "font-medium text-panel-ink"
                    : "tabular text-right"
                }
              >
                {celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
