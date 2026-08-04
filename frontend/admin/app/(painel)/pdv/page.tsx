"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL } from "@/lib/format";
import {
  Alerta,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { BuscaProduto } from "@/components/pdv/BuscaProduto";
import { SeletorCliente } from "@/components/pdv/SeletorCliente";
import {
  Pagamento,
  somaPagamentos,
  trocoDe,
  type LinhaPagamento,
} from "@/components/pdv/Pagamento";
import type {
  ClienteAdmin,
  Devolucao,
  SessaoCaixa,
  VariacaoPDV,
  VendaPDV,
} from "@/lib/types";

interface ItemVenda {
  variacao: VariacaoPDV;
  quantidade: number;
  /** Preço praticado — editável para desconto no item. */
  precoUnitario: number;
}

export default function PDVPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      {/* useSearchParams (crédito da troca) exige limite de Suspense. */}
      <Suspense fallback={<p className="text-panel-inkMuted">Carregando…</p>}>
        <PDVContent />
      </Suspense>
    </RequireAuth>
  );
}

function PDVContent() {
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [cliente, setCliente] = useState<ClienteAdmin | null>(null);
  const [desconto, setDesconto] = useState("");
  const [pagamentos, setPagamentos] = useState<LinhaPagamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluida, setConcluida] = useState<VendaPDV | null>(null);
  // Troca: crédito vindo de uma devolução (?credito=<id>).
  const [devolucao, setDevolucao] = useState<Devolucao | null>(null);

  const parametros = useSearchParams();
  const creditoId = parametros.get("credito");

  useEffect(() => {
    api
      .caixaAtual()
      .then((r) => setSessao(r.sessao))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!creditoId) return;
    api
      .buscarDevolucao(creditoId)
      .then(setDevolucao)
      .catch(() => setErro("Não foi possível carregar o crédito da troca."));
  }, [creditoId]);

  const subtotal = useMemo(
    () => itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0),
    [itens],
  );
  const descontoNum = Math.min(Number(desconto) || 0, subtotal);
  const total = subtotal - descontoNum;
  // O crédito abate antes das formas de pagamento — mesma regra do backend.
  const credito = Math.min(Number(devolucao?.credito_disponivel ?? 0), total);
  const pago = somaPagamentos(pagamentos);
  const falta = Math.max(0, total - credito - pago);

  function adicionarItem(v: VariacaoPDV) {
    setItens((prev) => {
      const existente = prev.find((i) => i.variacao.id === v.id);
      if (existente) {
        return prev.map((i) =>
          i.variacao.id === v.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...prev, { variacao: v, quantidade: 1, precoUnitario: Number(v.preco) }];
    });
  }

  function limpar() {
    setItens([]);
    setCliente(null);
    setDesconto("");
    setPagamentos([]);
    setErro(null);
  }

  async function finalizar() {
    setErro(null);
    setEnviando(true);
    try {
      const venda = await api.registrarVenda({
        itens: itens.map((i) => ({
          variacao: i.variacao.id,
          quantidade: i.quantidade,
          preco_unitario: i.precoUnitario.toFixed(2),
        })),
        pagamentos: pagamentos.map((p) => ({
          metodo: p.metodo,
          valor: p.valor,
          parcelas: p.parcelas,
          valor_recebido: p.valor_recebido ?? null,
        })),
        cliente: cliente?.id ?? null,
        desconto_manual: descontoNum.toFixed(2),
        devolucao: devolucao?.id ?? null,
      });
      setConcluida(venda);
      setDevolucao(null);
      limpar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir a venda.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return <p className="text-slate-400">Carregando…</p>;
  }

  // Sem caixa aberto não se vende: a venda precisa cair em um turno.
  if (!sessao) {
    return (
      <div>
        <PageHeader title="PDV" subtitle="Venda na loja física" />
        <Card className="text-center">
          <p className="font-medium text-panel-ink">Nenhum caixa aberto</p>
          <p className="mt-1 text-sm text-slate-500">
            Abra o caixa com o troco inicial para começar a vender.
          </p>
          <Link href="/caixa" className="mt-4 inline-block">
            <Button>Abrir caixa</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (concluida) {
    return (
      <VendaConcluida
        venda={concluida}
        onNovaVenda={() => setConcluida(null)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="PDV"
        subtitle={`Caixa aberto por ${sessao.operador_nome}`}
        action={
          <div className="flex gap-2">
            <Link href="/devolucoes">
              <Button variant="outline">Trocas e devoluções</Button>
            </Link>
            <Link href="/caixa">
              <Button variant="outline">Ver caixa</Button>
            </Link>
          </div>
        }
      />

      {devolucao && (
        <Alerta tone="info">
          Troca em andamento: crédito de{" "}
          <strong>{formatBRL(devolucao.credito_disponivel)}</strong> da devolução
          de {devolucao.itens.map((i) => i.produto_nome).join(", ")}. Escolha a
          peça nova — o crédito abate o total automaticamente.
        </Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna de itens */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-3 font-semibold text-panel-ink">Produtos</h2>
            <BuscaProduto onSelecionar={adicionarItem} />
          </Card>

          <Card bare>
            {itens.length === 0 ? (
              <EmptyState titulo={"Nenhum item na venda. Busque pelo SKU ou nome do produto."} />
            ) : (
              <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="w-28">Qtd</th>
                    <th className="w-32">Preço un.</th>
                    <th className="text-right">Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.variacao.id}>
                      <td>
                        <div className="font-medium text-panel-ink">
                          {item.variacao.produto}
                        </div>
                        <div className="text-xs text-slate-400">
                          {[item.variacao.cor, item.variacao.tamanho]
                            .filter(Boolean)
                            .join(" · ")}{" "}
                          · {item.variacao.sku}
                          {item.quantidade > item.variacao.saldo && (
                            <span className="ml-2 text-red-600">
                              saldo {item.variacao.saldo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className={inputClass}
                          value={item.quantidade}
                          onChange={(e) =>
                            setItens((prev) =>
                              prev.map((i) =>
                                i.variacao.id === item.variacao.id
                                  ? {
                                      ...i,
                                      quantidade: Math.max(
                                        1,
                                        Number(e.target.value) || 1,
                                      ),
                                    }
                                  : i,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className={inputClass}
                          value={item.precoUnitario}
                          inputMode="decimal"
                          onChange={(e) =>
                            setItens((prev) =>
                              prev.map((i) =>
                                i.variacao.id === item.variacao.id
                                  ? {
                                      ...i,
                                      precoUnitario:
                                        Number(
                                          e.target.value.replace(",", "."),
                                        ) || 0,
                                    }
                                  : i,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="text-right font-medium">
                        {formatBRL(item.precoUnitario * item.quantidade)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() =>
                            setItens((prev) =>
                              prev.filter(
                                (i) => i.variacao.id !== item.variacao.id,
                              ),
                            )
                          }
                          className="text-xs text-red-500 hover:underline"
                        >
                          remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-panel-ink">Pagamento</h2>
            <Pagamento
              total={total - credito}
              linhas={pagamentos}
              onChange={setPagamentos}
            />
          </Card>
        </div>

        {/* Coluna de fechamento */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold text-panel-ink">Cliente</h2>
            <SeletorCliente cliente={cliente} onChange={setCliente} />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-panel-ink">Resumo</h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd>{formatBRL(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Desconto</dt>
                <dd className="w-28">
                  <input
                    className={inputClass}
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value.replace(",", "."))}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t border-panel-border pt-2 text-base font-bold text-panel-ink">
                <dt>Total</dt>
                <dd>{formatBRL(total)}</dd>
              </div>
              {credito > 0 && (
                <div className="flex justify-between font-medium text-panel-accent">
                  <dt>Crédito da troca</dt>
                  <dd>− {formatBRL(credito)}</dd>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <dt>Pago</dt>
                <dd>{formatBRL(pago)}</dd>
              </div>
              {falta > 0 && (
                <div className="flex justify-between font-medium text-amber-700">
                  <dt>Falta</dt>
                  <dd>{formatBRL(falta)}</dd>
                </div>
              )}
              {trocoDe(pagamentos) > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <dt>Troco</dt>
                  <dd>{formatBRL(trocoDe(pagamentos))}</dd>
                </div>
              )}
            </dl>

            {erro && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {erro}
              </p>
            )}

            <div className="mt-4 space-y-2">
              <Button
                className="w-full"
                onClick={finalizar}
                disabled={
                  enviando || itens.length === 0 || total <= 0 || falta > 0
                }
              >
                {enviando ? "Finalizando…" : "Finalizar venda"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={limpar}>
                Cancelar venda
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function VendaConcluida({
  venda,
  onNovaVenda,
}: {
  venda: VendaPDV;
  onNovaVenda: () => void;
}) {
  const troco = venda.pagamentos.reduce(
    (acc, p) => acc + Number(p.troco ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader title="Venda concluída" subtitle={`Pedido #${venda.id.slice(0, 8)}`} />
      <Card className="mx-auto max-w-lg text-center">
        <p className="text-4xl">✓</p>
        <p className="mt-2 text-2xl font-bold text-panel-ink">
          {formatBRL(venda.total)}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {venda.pagamentos.map((p, i) => (
            <Badge key={i} tone="blue">
              {p.metodo}
              {p.parcelas > 1 && ` ${p.parcelas}x`} · {formatBRL(p.valor)}
            </Badge>
          ))}
        </div>

        {troco > 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-lg font-bold text-amber-800">
            Troco: {formatBRL(troco)}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onNovaVenda}>Nova venda</Button>
          <a
            href={`/admin/recibo/${venda.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-panel-accent px-4 py-2 text-sm font-medium text-panel-accent hover:bg-cyan-50"
          >
            Imprimir recibo ↗
          </a>
        </div>
      </Card>
    </div>
  );
}
