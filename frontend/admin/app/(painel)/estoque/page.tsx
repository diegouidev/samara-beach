"use client";

import { useEffect, useState } from "react";
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
      <EstoqueContent />
    </RequireAuth>
  );
}

function EstoqueContent() {
  const [baixo, setBaixo] = useState<EstoqueBaixoItem[]>([]);
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([]);
  const [variacoes, setVariacoes] = useState<VariacaoProduto[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

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
      <PageHeader title="Estoque" subtitle="Movimentações e alertas de saldo" />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">
            Registrar movimentação
          </h2>
          <MovimentacaoForm
            variacoes={variacoes}
            onSalvo={() => {
              setMsg("Movimentação registrada.");
              setTimeout(() => setMsg(null), 2500);
              carregar();
            }}
          />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">Estoque baixo</h2>
          {baixo.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum SKU abaixo do mínimo.</p>
          ) : (
            <ul className="divide-y divide-panel-border">
              {baixo.map((i) => (
                <li key={i.variacao} className="flex justify-between py-2 text-sm">
                  <span>
                    {i.produto} <span className="text-slate-400">({i.sku})</span>
                  </span>
                  <Badge tone="amber">
                    {i.saldo} / mín {i.estoque_minimo}
                  </Badge>
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
        )}
      </Card>
    </div>
  );
}

function MovimentacaoForm({
  variacoes,
  onSalvo,
}: {
  variacoes: VariacaoProduto[];
  onSalvo: () => void;
}) {
  const [variacao, setVariacao] = useState("");
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
