"use client";

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
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
  textareaClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { formatBRL, formatData } from "@/lib/format";
import {
  CATEGORIAS_DESPESA,
  type CategoriaDespesa,
  type ContaPagar,
  type Fornecedor,
  type PedidoCompra,
  type ResultadoPeriodo,
  type ResumoContas,
} from "@/lib/types";

export default function ComprasPage() {
  return (
    <RequireAuth papeis={["admin", "estoque", "financeiro"]}>
      <ComprasContent />
    </RequireAuth>
  );
}

const TONE_COMPRA: Record<string, "neutral" | "amber" | "green" | "blue" | "red"> = {
  rascunho: "neutral",
  enviado: "amber",
  confirmado: "blue",
  recebido: "green",
  cancelado: "red",
};
const TONE_CONTA: Record<string, "neutral" | "amber" | "green" | "red" | "blue"> = {
  aberta: "blue",
  paga: "green",
  vencida: "red",
  cancelada: "neutral",
};

/** Primeiro e último dia do mês corrente, para o filtro de período. */
function mesCorrente() {
  const hoje = new Date();
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: iso(primeiro), fim: iso(ultimo) };
}

type Aba = "contas" | "compras" | "resultado";

function ComprasContent() {
  const [aba, setAba] = useState<Aba>("contas");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [resumo, setResumo] = useState<ResumoContas | null>(null);
  const [novoCompra, setNovoCompra] = useState(false);
  const [novaConta, setNovaConta] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(mesCorrente);

  function avisar(texto: string) {
    setMsg(texto);
    setTimeout(() => setMsg(null), 5000);
  }

  function carregar() {
    api.listarFornecedores().then(setFornecedores).catch(() => setFornecedores([]));
    api.listarPedidosCompra().then(setPedidos).catch(() => setPedidos([]));
    api.listarContasPagar().then(setContas).catch(() => setContas([]));
    api.resumoContas(periodo).then(setResumo).catch(() => setResumo(null));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [periodo.inicio, periodo.fim]);

  async function pagar(conta: ContaPagar) {
    try {
      const { proxima } = await api.pagarConta(conta.id);
      avisar(
        proxima
          ? `Conta paga. A próxima já foi lançada para ${formatData(proxima.vencimento)}.`
          : "Conta paga.",
      );
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao pagar.");
    }
  }

  const nomeForn = (id: string | null) =>
    fornecedores.find((f) => f.id === id)?.nome ?? "—";

  return (
    <div>
      <PageHeader
        title="Compras & Financeiro"
        subtitle="Despesas da loja, compras a fornecedor e resultado do período"
      />

      <div className="mb-6 inline-flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        {(
          [
            ["contas", "Contas a pagar"],
            ["compras", "Pedidos de compra"],
            ["resultado", "Resultado do mês"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`rounded-lg px-4 py-1.5 transition ${
              aba === k
                ? "bg-panel-surface font-medium text-panel-ink shadow-card"
                : "text-panel-inkMuted hover:text-panel-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <Alerta tone="sucesso">{msg}</Alerta>}
      {erro && <Alerta tone="erro">{erro}</Alerta>}

      {aba === "contas" && (
        <ContasTab
          contas={contas}
          resumo={resumo}
          fornecedores={fornecedores}
          mostrarForm={novaConta}
          onToggleForm={() => setNovaConta((v) => !v)}
          onCriada={() => {
            setNovaConta(false);
            avisar("Conta lançada.");
            carregar();
          }}
          onPagar={pagar}
        />
      )}

      {aba === "compras" && (
        <div>
          <div className="mb-3 flex justify-end">
            <Button
              onClick={() => setNovoCompra((v) => !v)}
              disabled={fornecedores.length === 0}
              title={
                fornecedores.length === 0
                  ? "Cadastre um fornecedor primeiro"
                  : undefined
              }
            >
              {novoCompra ? "Cancelar" : "+ Pedido de compra"}
            </Button>
          </div>
          {novoCompra && (
            <Card className="mb-4">
              <FormPedidoCompra
                fornecedores={fornecedores}
                onCriado={() => {
                  setNovoCompra(false);
                  carregar();
                }}
              />
            </Card>
          )}
          <Card bare>
            {pedidos.length === 0 ? (
              <EmptyState
                titulo="Nenhum pedido de compra"
                descricao="Registre as compras de mercadoria feitas aos fornecedores."
              />
            ) : (
              <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>Data prevista</th>
                    <th className="text-right">Custo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-panel-ink">
                        {nomeForn(p.fornecedor)}
                      </td>
                      <td>
                        {p.data_prevista ? formatData(p.data_prevista) : "—"}
                      </td>
                      <td className="tabular text-right">
                        {formatBRL(p.custo_total)}
                      </td>
                      <td>
                        <Badge tone={TONE_COMPRA[p.status]} dot>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {aba === "resultado" && (
        <ResultadoTab periodo={periodo} onPeriodo={setPeriodo} />
      )}
    </div>
  );
}

// =========================================================================
// Contas a pagar
// =========================================================================

function ContasTab({
  contas,
  resumo,
  fornecedores,
  mostrarForm,
  onToggleForm,
  onCriada,
  onPagar,
}: {
  contas: ContaPagar[];
  resumo: ResumoContas | null;
  fornecedores: Fornecedor[];
  mostrarForm: boolean;
  onToggleForm: () => void;
  onCriada: () => void;
  onPagar: (c: ContaPagar) => void;
}) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const filtradas = useMemo(
    () =>
      contas.filter((c) => {
        if (filtroStatus && c.status_efetivo !== filtroStatus) return false;
        if (filtroCategoria && c.categoria !== filtroCategoria) return false;
        return true;
      }),
    [contas, filtroStatus, filtroCategoria],
  );

  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Em aberto"
          value={formatBRL(resumo?.total_aberto ?? 0)}
          hint="todas as contas ainda não pagas"
        />
        <Stat
          label="Vencidas"
          value={formatBRL(resumo?.total_vencido ?? 0)}
          hint={`${resumo?.num_vencidas ?? 0} conta(s) atrasada(s)`}
          tone={resumo && Number(resumo.total_vencido) > 0 ? "atencao" : "neutral"}
        />
        <Stat
          label="Pago no período"
          value={formatBRL(resumo?.total_pago ?? 0)}
          tone="positivo"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            className={`${inputClass} w-auto`}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="aberta">Em aberto</option>
            <option value="vencida">Vencidas</option>
            <option value="paga">Pagas</option>
          </select>
          <select
            className={`${inputClass} w-auto`}
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS_DESPESA.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onToggleForm}>
          {mostrarForm ? "Cancelar" : "+ Nova conta"}
        </Button>
      </div>

      {mostrarForm && (
        <Card className="mb-4" title="Nova conta a pagar">
          <FormContaPagar fornecedores={fornecedores} onCriado={onCriada} />
        </Card>
      )}

      <Card bare>
        {filtradas.length === 0 ? (
          <EmptyState
            titulo={
              contas.length === 0
                ? "Nenhuma conta lançada"
                : "Nenhuma conta com esses filtros"
            }
            descricao={
              contas.length === 0
                ? "Lance aqui as despesas da loja: água, luz, internet, aluguel…"
                : undefined
            }
          />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Conta</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="font-medium text-panel-ink">
                      {c.titulo}
                    </span>
                    {c.fornecedor_nome && (
                      <span className="block text-xs text-panel-inkMuted">
                        {c.fornecedor_nome}
                      </span>
                    )}
                    {c.recorrente && (
                      <span className="block text-xs text-panel-accent">
                        repete todo mês
                      </span>
                    )}
                  </td>
                  <td>{c.categoria_label}</td>
                  <td>
                    {formatData(c.vencimento)}
                    {c.pago_em && (
                      <span className="block text-xs text-panel-inkMuted">
                        pago em {formatData(c.pago_em)}
                      </span>
                    )}
                  </td>
                  <td className="tabular text-right font-medium text-panel-ink">
                    {formatBRL(c.valor)}
                  </td>
                  <td>
                    <Badge tone={TONE_CONTA[c.status_efetivo]} dot>
                      {c.status_efetivo}
                    </Badge>
                  </td>
                  <td className="text-right">
                    {c.status_efetivo !== "paga" && (
                      <Button size="sm" variant="soft" onClick={() => onPagar(c)}>
                        Marcar paga
                      </Button>
                    )}
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

function FormContaPagar({
  fornecedores,
  onCriado,
}: {
  fornecedores: Fornecedor[];
  onCriado: () => void;
}) {
  const [fornecedor, setFornecedor] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("energia");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.criarContaPagar({
        fornecedor: fornecedor || null,
        categoria,
        descricao,
        valor: (Number(valor) || 0).toFixed(2),
        vencimento,
        recorrente,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao lançar a conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Categoria">
          <select
            className={inputClass}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)}
          >
            {CATEGORIAS_DESPESA.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descrição">
          <input
            className={inputClass}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Energia — julho"
            required={!fornecedor}
          />
        </Field>
        <Field label="Valor (R$)">
          <input
            className={inputClass}
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(",", "."))}
            placeholder="480.00"
            inputMode="decimal"
            required
          />
        </Field>
        <Field label="Vencimento">
          <input
            className={inputClass}
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field
        label="Fornecedor (opcional)"
        hint="Deixe em branco para despesas da loja, como água, luz e internet."
      >
        <select
          className={inputClass}
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
        >
          <option value="">— nenhum (despesa da loja)</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={recorrente}
          onChange={(e) => setRecorrente(e.target.checked)}
        />
        <span>
          Repete todo mês
          <span className="block text-xs text-panel-inkMuted">
            Ao marcar como paga, a conta do mês seguinte é lançada
            automaticamente com o mesmo valor.
          </span>
        </span>
      </label>

      {erro && <Alerta tone="erro">{erro}</Alerta>}

      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Lançar conta"}
      </Button>
    </form>
  );
}

// =========================================================================
// Resultado do período
// =========================================================================

function ResultadoTab({
  periodo,
  onPeriodo,
}: {
  periodo: { inicio: string; fim: string };
  onPeriodo: (p: { inicio: string; fim: string }) => void;
}) {
  const [dados, setDados] = useState<ResultadoPeriodo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .resultadoPeriodo(periodo)
      .then(setDados)
      .catch((e) =>
        setErro(e instanceof Error ? e.message : "Erro ao carregar."),
      );
  }, [periodo]);

  if (erro) return <Alerta tone="erro">{erro}</Alerta>;

  const resultado = Number(dados?.resultado ?? 0);

  return (
    <div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="De">
            <input
              className={inputClass}
              type="date"
              value={periodo.inicio}
              onChange={(e) => onPeriodo({ ...periodo, inicio: e.target.value })}
            />
          </Field>
          <Field label="Até">
            <input
              className={inputClass}
              type="date"
              value={periodo.fim}
              onChange={(e) => onPeriodo({ ...periodo, fim: e.target.value })}
            />
          </Field>
          <Button variant="outline" onClick={() => onPeriodo(mesCorrente())}>
            Mês atual
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Receita líquida"
          value={formatBRL(dados?.receita_liquida ?? 0)}
          hint={`bruta ${formatBRL(dados?.receita_bruta ?? 0)} − devoluções ${formatBRL(dados?.devolucoes ?? 0)}`}
        />
        <Stat
          label="Custo dos produtos"
          value={formatBRL(dados?.custo_produtos ?? 0)}
          hint={`lucro bruto ${formatBRL(dados?.lucro_bruto ?? 0)} (${dados?.margem_percentual ?? 0}%)`}
        />
        <Stat
          label="Despesas pagas"
          value={formatBRL(dados?.despesas ?? 0)}
          tone="atencao"
        />
        <Stat
          label="Resultado"
          value={formatBRL(resultado)}
          hint={resultado >= 0 ? "lucro no período" : "prejuízo no período"}
          tone={resultado >= 0 ? "positivo" : "atencao"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Receita por canal" bare>
          <ul className="divide-y divide-panel-border">
            {(
              [
                ["online", "Loja online"],
                ["presencial", "Loja física"],
              ] as const
            ).map(([canal, label]) => {
              const t = dados?.por_canal?.[canal];
              return (
                <li
                  key={canal}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium text-panel-ink">{label}</span>
                    <span className="block text-xs text-panel-inkMuted">
                      {t?.num_pedidos ?? 0} pedido(s)
                    </span>
                  </span>
                  <span className="tabular font-medium text-panel-ink">
                    {formatBRL(t?.faturamento ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Despesas por categoria" bare>
          {dados && dados.despesas_por_categoria.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {dados.despesas_por_categoria.map((d) => (
                <li
                  key={d.categoria}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="text-panel-inkSoft">
                    {CATEGORIAS_DESPESA.find((c) => c.valor === d.categoria)
                      ?.label ?? d.categoria}
                  </span>
                  <span className="tabular font-medium text-panel-ink">
                    {formatBRL(d.total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              titulo="Nenhuma despesa paga no período"
              descricao="Só entram aqui as contas efetivamente pagas — é o que saiu do caixa."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

// =========================================================================
// Pedido de compra
// =========================================================================

function FormPedidoCompra({
  fornecedores,
  onCriado,
}: {
  fornecedores: Fornecedor[];
  onCriado: () => void;
}) {
  const [fornecedor, setFornecedor] = useState(fornecedores[0]?.id ?? "");
  const [dataPrevista, setDataPrevista] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.criarPedidoCompra({
        fornecedor,
        data_prevista: dataPrevista || null,
        observacoes: obs,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fornecedor">
          <select
            className={inputClass}
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            required
          >
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data prevista">
          <input
            className={inputClass}
            type="date"
            value={dataPrevista}
            onChange={(e) => setDataPrevista(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Observações">
        <textarea
          className={textareaClass}
          rows={2}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </Field>
      {erro && <Alerta tone="erro">{erro}</Alerta>}
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Criar pedido de compra"}
      </Button>
    </form>
  );
}
