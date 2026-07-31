"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { formatBRL, formatData } from "@/lib/format";
import type {
  ContaPagar,
  Fornecedor,
  PedidoCompra,
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
const TONE_CONTA: Record<string, "neutral" | "amber" | "green" | "red"> = {
  aberta: "amber",
  paga: "green",
  vencida: "red",
  cancelada: "neutral",
};

function ComprasContent() {
  const [aba, setAba] = useState<"compras" | "contas">("compras");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [novoCompra, setNovoCompra] = useState(false);
  const [novaConta, setNovaConta] = useState(false);

  function carregar() {
    api.listarFornecedores().then(setFornecedores);
    api.listarPedidosCompra().then(setPedidos);
    api.listarContasPagar().then(setContas);
  }
  useEffect(carregar, []);

  const nomeForn = (id: string) =>
    fornecedores.find((f) => f.id === id)?.nome ?? "—";

  return (
    <div>
      <PageHeader
        title="Compras & Financeiro"
        subtitle="Pedidos de compra a fornecedor e contas a pagar"
      />

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {(["compras", "contas"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`rounded-md px-4 py-1.5 ${aba === k ? "bg-white font-medium shadow" : "text-slate-500"}`}
          >
            {k === "compras" ? "Pedidos de compra" : "Contas a pagar"}
          </button>
        ))}
      </div>

      {fornecedores.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Cadastre um fornecedor primeiro (aba Fornecedores) para lançar compras/contas.
        </p>
      )}

      {aba === "compras" ? (
        <div>
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setNovoCompra((v) => !v)} disabled={fornecedores.length === 0}>
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
          <Card className="p-0">
            {pedidos.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Nenhum pedido de compra.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-panel-border text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fornecedor</th>
                    <th className="px-5 py-3">Data prevista</th>
                    <th className="px-5 py-3">Custo</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => (
                    <tr key={p.id} className="border-b border-panel-border last:border-0">
                      <td className="px-5 py-3 font-medium">{nomeForn(p.fornecedor)}</td>
                      <td className="px-5 py-3">
                        {p.data_prevista ? formatData(p.data_prevista) : "—"}
                      </td>
                      <td className="px-5 py-3">{formatBRL(p.custo_total)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={TONE_COMPRA[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setNovaConta((v) => !v)} disabled={fornecedores.length === 0}>
              {novaConta ? "Cancelar" : "+ Conta a pagar"}
            </Button>
          </div>
          {novaConta && (
            <Card className="mb-4">
              <FormContaPagar
                fornecedores={fornecedores}
                onCriado={() => {
                  setNovaConta(false);
                  carregar();
                }}
              />
            </Card>
          )}
          <Card className="p-0">
            {contas.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Nenhuma conta a pagar.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-panel-border text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fornecedor</th>
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-5 py-3">Vencimento</th>
                    <th className="px-5 py-3">Valor</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c) => (
                    <tr key={c.id} className="border-b border-panel-border last:border-0">
                      <td className="px-5 py-3 font-medium">{nomeForn(c.fornecedor)}</td>
                      <td className="px-5 py-3 text-slate-600">{c.descricao || "—"}</td>
                      <td className="px-5 py-3">{formatData(c.vencimento)}</td>
                      <td className="px-5 py-3">{formatBRL(c.valor)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={TONE_CONTA[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {c.status !== "paga" && (
                          <button
                            onClick={async () => {
                              await api.atualizarContaPagar(c.id, {
                                status: "paga",
                                pago_em: new Date().toISOString().slice(0, 10),
                              });
                              carregar();
                            }}
                            className="text-panel-accent hover:underline"
                          >
                            Marcar paga
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

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
          <select className={inputClass} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} required>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Data prevista">
          <input className={inputClass} type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
        </Field>
      </div>
      <Field label="Observações">
        <textarea className={inputClass} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
      </Field>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Criar pedido de compra"}
      </Button>
    </form>
  );
}

function FormContaPagar({
  fornecedores,
  onCriado,
}: {
  fornecedores: Fornecedor[];
  onCriado: () => void;
}) {
  const [fornecedor, setFornecedor] = useState(fornecedores[0]?.id ?? "");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.criarContaPagar({ fornecedor, descricao, valor, vencimento });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fornecedor">
          <select className={inputClass} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} required>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor (R$)">
          <input className={inputClass} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="500.00" required />
        </Field>
        <Field label="Vencimento">
          <input className={inputClass} type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
        </Field>
        <Field label="Descrição">
          <input className={inputClass} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Field>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Lançar conta"}
      </Button>
    </form>
  );
}
