"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as api from "@/lib/api";
import { Alerta, Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { formatData } from "@/lib/format";
import type {
  EstoqueBaixoItem,
  MovimentacaoEstoque,
  Produto,
  ProdutoResumo,
  VariacaoProduto,
} from "@/lib/types";

export default function EstoquePage() {
  return (
    <RequireAuth papeis={["admin", "estoque"]}>
      {/* useSearchParams (?alerta=1, vindo da dashboard) exige Suspense. */}
      <Suspense fallback={<p className="text-panel-inkMuted">Carregando…</p>}>
        <EstoqueContent />
      </Suspense>
    </RequireAuth>
  );
}

function EstoqueContent() {
  const [baixo, setBaixo] = useState<EstoqueBaixoItem[]>([]);
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([]);
  const [variacoes, setVariacoes] = useState<VariacaoProduto[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  // Variação que o formulário deve abrir já selecionada — vem do clique em
  // "Ajustar" na lista de alerta, ou de ?variacao= (link da dashboard).
  const [preSelecionada, setPreSelecionada] = useState("");
  const parametros = useSearchParams();
  const soAlertas = parametros.get("alerta") === "1";

  async function carregar() {
    const [b, m] = await Promise.all([
      api.estoqueBaixo(),
      api.listarMovimentacoes(),
    ]);
    setBaixo(b.results);
    setMovs(m.slice(0, 15));
  }

  useEffect(() => {
    carregar();
    // carrega variações (via produtos) para o seletor de ajuste
    api.listarProdutos().then(async (ps: ProdutoResumo[]) => {
      const detalhes = await Promise.all(
        ps.map((p) => api.buscarProduto(p.slug)),
      );
      setVariacoes(detalhes.flatMap((d: Produto) => d.variacoes));
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle={
          soAlertas && baixo.length > 0
            ? `${baixo.length} SKU${baixo.length === 1 ? "" : "s"} abaixo do mínimo — use "Repor" para ajustar`
            : "Movimentações e alertas de saldo"
        }
      />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}

      {/* Vindo da dashboard, a lista de alerta vem primeiro — é o motivo
          de a pessoa ter chegado aqui. */}
      <div
        className={`grid gap-6 lg:grid-cols-2 ${
          soAlertas ? "[&>*:first-child]:lg:order-2" : ""
        }`}
      >
        <Card id="form-movimentacao">
          <h2 className="mb-4 font-semibold text-panel-ink">
            Registrar movimentação
          </h2>
          <MovimentacaoForm
            variacoes={variacoes}
            preSelecionada={preSelecionada}
            onSalvo={() => {
              setMsg("Movimentação registrada.");
              setTimeout(() => setMsg(null), 2500);
              setPreSelecionada("");
              carregar();
            }}
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-panel-ink">
              Estoque baixo
              {baixo.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {baixo.length}
                </span>
              )}
            </h2>
            {baixo.length > 0 && (
              <span className="text-xs text-panel-inkMuted">
                Abaixo do mínimo
              </span>
            )}
          </div>
          {baixo.length === 0 ? (
            <p className="text-sm text-panel-inkMuted">
              Nenhum SKU abaixo do mínimo.
            </p>
          ) : (
            <ul className="divide-y divide-panel-border">
              {baixo.map((i) => (
                <li
                  key={i.variacao}
                  className={`flex flex-wrap items-center gap-3 py-3 ${
                    preSelecionada === i.variacao
                      ? "-mx-2 rounded-xl bg-panel-accent/5 px-2"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-panel-ink">
                      {i.produto}
                    </p>
                    <p className="truncate font-mono text-xs text-panel-inkMuted">
                      {i.sku}
                    </p>
                  </div>
                  <Badge tone={i.saldo === 0 ? "red" : "amber"} dot>
                    {i.saldo} / mín {i.estoque_minimo}
                  </Badge>
                  {/* Leva o SKU direto para o formulário ao lado, já
                      selecionado — evita procurá-lo numa lista longa. */}
                  <Button
                    variant="soft"
                    onClick={() => {
                      setPreSelecionada(i.variacao);
                      document
                        .getElementById("form-movimentacao")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    Repor
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold text-panel-ink">
          Últimas movimentações
        </h2>
        {movs.length === 0 ? (
          <p className="text-sm text-slate-400">Sem movimentações.</p>
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Origem</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} className="border-t border-panel-border">
                  <td>{formatData(m.created_at)}</td>
                  <td className="capitalize">{m.tipo}</td>
                  <td className="capitalize">{m.origem}</td>
                  <td className="text-right">{m.quantidade}</td>
                  <td className="text-right font-medium">
                    {m.saldo_resultante}
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

function MovimentacaoForm({
  variacoes,
  onSalvo,
  preSelecionada = "",
}: {
  variacoes: VariacaoProduto[];
  onSalvo: () => void;
  /** SKU escolhido na lista de alerta — abre o formulário já apontando nele. */
  preSelecionada?: string;
}) {
  const [variacao, setVariacao] = useState("");

  // Clicar em "Repor" na lista ao lado seleciona o SKU aqui.
  useEffect(() => {
    if (preSelecionada) setVariacao(preSelecionada);
  }, [preSelecionada]);
  const [tipo, setTipo] = useState("entrada");
  const [quantidade, setQuantidade] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const qtd = Number(quantidade);
      // entrada = positivo; saída = negativo
      const quantidadeFinal = tipo === "saida" ? -Math.abs(qtd) : Math.abs(qtd);
      await api.criarMovimentacao({
        variacao: variacao || variacoes[0]?.id,
        tipo,
        origem: "ajuste",
        quantidade: quantidadeFinal,
        observacoes: "Ajuste manual pelo painel.",
      });
      setQuantidade("1");
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Field label="Variação (SKU)">
        <select
          className={inputClass}
          value={variacao}
          onChange={(e) => setVariacao(e.target.value)}
        >
          {variacoes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.sku} — {[v.cor, v.tamanho].filter(Boolean).join("/")}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            className={inputClass}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </Field>
        <Field label="Quantidade">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Field>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando || variacoes.length === 0}>
        {enviando ? "Registrando…" : "Registrar"}
      </Button>
    </form>
  );
}
