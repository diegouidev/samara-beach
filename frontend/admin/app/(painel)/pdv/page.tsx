"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { Alerta, Badge, Button, Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { IconeBusca, IconeCaixa, IconeFechar } from "@/components/ui/icons";
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

  const totalPecas = useMemo(
    () => itens.reduce((acc, i) => acc + i.quantidade, 0),
    [itens],
  );

  function mudarQuantidade(variacaoId: string, quantidade: number) {
    setItens((prev) =>
      prev.map((i) =>
        i.variacao.id === variacaoId
          ? { ...i, quantidade: Math.max(1, quantidade) }
          : i,
      ),
    );
  }

  function mudarPreco(variacaoId: string, precoUnitario: number) {
    setItens((prev) =>
      prev.map((i) => (i.variacao.id === variacaoId ? { ...i, precoUnitario } : i)),
    );
  }

  function removerItem(variacaoId: string) {
    setItens((prev) => prev.filter((i) => i.variacao.id !== variacaoId));
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
        <div className="mx-auto max-w-md rounded-2xl border border-panel-border bg-panel-surface px-8 py-12 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-panel-accent/10 text-panel-accent">
            <IconeCaixa className="h-7 w-7" />
          </span>
          <p className="text-lg font-semibold text-panel-ink">
            Nenhum caixa aberto
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-panel-inkSoft">
            Toda venda precisa cair em um turno. Abra o caixa com o troco da
            gaveta para começar.
          </p>
          <Link href="/caixa" className="mt-6 inline-block">
            <Button className="h-12 px-8">Abrir caixa</Button>
          </Link>
        </div>
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
    <div className="pb-40 xl:pb-0">
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

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        {/* ---------------- Coluna da venda ---------------- */}
        <div className="space-y-5">
          {/* A busca é o ponto de entrada de tudo: ganha a maior presença. */}
          <div className="rounded-2xl border border-panel-border bg-panel-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-panel-ink">Adicionar produto</h2>
              <span className="hidden text-xs text-panel-inkMuted sm:block">
                Digite e pressione <Tecla>Enter</Tecla> para adicionar
              </span>
            </div>
            <BuscaProduto onSelecionar={adicionarItem} />
          </div>

          {/* ---------------- Itens ---------------- */}
          <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel-surface shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-panel-border px-5 py-4">
              <h2 className="font-semibold text-panel-ink">
                Itens
                {itens.length > 0 && (
                  <span className="ml-2 rounded-full bg-panel-accent/10 px-2.5 py-0.5 text-xs font-medium text-panel-accent">
                    {totalPecas} {totalPecas === 1 ? "peça" : "peças"}
                  </span>
                )}
              </h2>
              {itens.length > 0 && (
                <button
                  onClick={() => setItens([])}
                  className="text-xs font-medium text-panel-inkMuted transition hover:text-red-600"
                >
                  Limpar itens
                </button>
              )}
            </div>

            {itens.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-panel-surfaceMuted text-panel-inkMuted">
                  <IconeBusca className="h-6 w-6" />
                </span>
                <p className="font-medium text-panel-ink">
                  Nenhum item na venda
                </p>
                <p className="mt-1 text-sm text-panel-inkMuted">
                  Busque pelo SKU, nome ou cor do produto acima.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-panel-border">
                {itens.map((item) => (
                  <LinhaItem
                    key={item.variacao.id}
                    item={item}
                    onQuantidade={(q) => mudarQuantidade(item.variacao.id, q)}
                    onPreco={(v) => mudarPreco(item.variacao.id, v)}
                    onRemover={() => removerItem(item.variacao.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* ---------------- Pagamento ---------------- */}
          <div className="rounded-2xl border border-panel-border bg-panel-surface p-5 shadow-card">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-panel-ink">Pagamento</h2>
              {falta > 0 && itens.length > 0 && (
                <span className="text-sm font-medium tabular-nums text-amber-700">
                  Falta {formatBRL(falta)}
                </span>
              )}
              {itens.length > 0 && falta === 0 && (
                <span className="text-sm font-medium text-emerald-700">
                  Pagamento completo
                </span>
              )}
            </div>
            <Pagamento
              total={total - credito}
              linhas={pagamentos}
              onChange={setPagamentos}
            />
          </div>
        </div>

        {/* ---------------- Coluna de fechamento ---------------- */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-panel-border bg-panel-surface p-5 shadow-card">
            <h2 className="mb-3 font-semibold text-panel-ink">Cliente</h2>
            <SeletorCliente cliente={cliente} onChange={setCliente} />
          </div>

          {/* No desktop o resumo acompanha a rolagem; no tablet vira barra fixa. */}
          <div className="hidden xl:sticky xl:top-5 xl:block">
            <ResumoVenda
              subtotal={subtotal}
              desconto={desconto}
              onDesconto={setDesconto}
              total={total}
              credito={credito}
              pago={pago}
              falta={falta}
              troco={trocoDe(pagamentos)}
              erro={erro}
              enviando={enviando}
              podeFinalizar={
                !enviando && itens.length > 0 && total > 0 && falta === 0
              }
              onFinalizar={finalizar}
              onCancelar={limpar}
            />
          </div>
        </div>
      </div>

      {/* Barra de fechamento no tablet/mobile: o total e o botão de finalizar
          não podem depender de rolagem numa tela de balcão. */}
      {itens.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-panel-border bg-panel-surface/95 px-4 py-3 shadow-[0_-4px_16px_-8px_rgb(15_23_42/0.2)] backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-panel-inkMuted">
                {totalPecas} {totalPecas === 1 ? "peça" : "peças"}
                {falta > 0 && ` · falta ${formatBRL(falta)}`}
              </p>
              <p className="truncate text-2xl font-bold tabular-nums text-panel-ink">
                {formatBRL(total - credito)}
              </p>
            </div>
            <Button
              className="h-14 flex-shrink-0 px-7 text-base"
              onClick={finalizar}
              disabled={enviando || total <= 0 || falta > 0}
            >
              {enviando ? "Finalizando…" : "Finalizar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tecla de atalho, para a dica de uso não virar texto solto. */
function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-panel-borderStrong bg-panel-surfaceMuted px-1.5 py-0.5 font-mono text-[11px] text-panel-inkSoft">
      {children}
    </kbd>
  );
}

/**
 * Uma linha de item. Quantidade em +/− (o balcão soma peça a peça, e no
 * tablet um input numérico é hostil) e preço editável só ao clicar, para
 * desconto pontual sem poluir a linha.
 */
function LinhaItem({
  item,
  onQuantidade,
  onPreco,
  onRemover,
}: {
  item: ItemVenda;
  onQuantidade: (q: number) => void;
  onPreco: (v: number) => void;
  onRemover: () => void;
}) {
  const [editandoPreco, setEditandoPreco] = useState(false);
  const semSaldo = item.quantidade > item.variacao.saldo;
  const detalhes = [item.variacao.cor, item.variacao.tamanho]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-panel-surfaceMuted/60">
      <div className="min-w-[180px] flex-1">
        <p className="font-medium text-panel-ink">{item.variacao.produto}</p>
        <p className="mt-0.5 text-xs text-panel-inkMuted">
          {detalhes && `${detalhes} · `}
          <span className="font-mono">{item.variacao.sku}</span>
        </p>
        {semSaldo && (
          <p className="mt-1 text-xs font-medium text-red-600">
            Estoque insuficiente — restam {item.variacao.saldo}
          </p>
        )}
      </div>

      {/* Quantidade: alvos de 40px, sem depender de hover. */}
      <div className="flex items-center rounded-xl border border-panel-borderStrong">
        <button
          onClick={() => onQuantidade(item.quantidade - 1)}
          disabled={item.quantidade <= 1}
          aria-label="Diminuir quantidade"
          className="flex h-10 w-10 items-center justify-center rounded-l-xl text-lg text-panel-inkSoft transition hover:bg-panel-surfaceMuted disabled:opacity-30"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums text-panel-ink">
          {item.quantidade}
        </span>
        <button
          onClick={() => onQuantidade(item.quantidade + 1)}
          aria-label="Aumentar quantidade"
          className="flex h-10 w-10 items-center justify-center rounded-r-xl text-lg text-panel-inkSoft transition hover:bg-panel-surfaceMuted"
        >
          +
        </button>
      </div>

      {/* Preço: texto até alguém precisar mudar. */}
      <div className="w-28 text-right">
        {editandoPreco ? (
          <input
            autoFocus
            className="h-10 w-full rounded-xl border border-panel-accent bg-panel-surface px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-4 focus:ring-panel-accent/15"
            value={item.precoUnitario}
            inputMode="decimal"
            onChange={(e) =>
              onPreco(Number(e.target.value.replace(",", ".")) || 0)
            }
            onBlur={() => setEditandoPreco(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditandoPreco(false)}
          />
        ) : (
          <button
            onClick={() => setEditandoPreco(true)}
            className="w-full rounded-lg px-2 py-1.5 text-right transition hover:bg-panel-surfaceMuted"
            title="Clique para alterar o preço deste item"
          >
            <span className="block text-sm font-semibold tabular-nums text-panel-ink">
              {formatBRL(item.precoUnitario * item.quantidade)}
            </span>
            {item.quantidade > 1 && (
              <span className="block text-[11px] text-panel-inkMuted">
                {formatBRL(item.precoUnitario)} cada
              </span>
            )}
          </button>
        )}
      </div>

      <button
        onClick={onRemover}
        aria-label={`Remover ${item.variacao.produto}`}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-panel-inkMuted transition hover:bg-red-50 hover:text-red-600"
      >
        <IconeFechar className="h-4 w-4" />
      </button>
    </li>
  );
}

/** Fechamento da venda — o total é o maior número da tela. */
function ResumoVenda({
  subtotal,
  desconto,
  onDesconto,
  total,
  credito,
  pago,
  falta,
  troco,
  erro,
  enviando,
  podeFinalizar,
  onFinalizar,
  onCancelar,
}: {
  subtotal: number;
  desconto: string;
  onDesconto: (v: string) => void;
  total: number;
  credito: number;
  pago: number;
  falta: number;
  troco: number;
  erro: string | null;
  enviando: boolean;
  podeFinalizar: boolean;
  onFinalizar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel-surface shadow-card">
      <div className="space-y-3 px-5 pt-5">
        <Linha rotulo="Subtotal" valor={formatBRL(subtotal)} />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-panel-inkSoft">Desconto</span>
          <input
            className="h-9 w-28 rounded-lg border border-panel-borderStrong bg-panel-surface px-3 text-right text-sm tabular-nums focus:border-panel-accent focus:outline-none focus:ring-4 focus:ring-panel-accent/15"
            value={desconto}
            onChange={(e) => onDesconto(e.target.value.replace(",", "."))}
            placeholder="0,00"
            inputMode="decimal"
          />
        </div>

        {credito > 0 && (
          <Linha
            rotulo="Crédito da troca"
            valor={`− ${formatBRL(credito)}`}
            tom="accent"
          />
        )}
      </div>

      {/* O número que decide a venda. */}
      <div className="mt-4 border-y border-panel-border bg-panel-surfaceMuted px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-panel-inkMuted">
          Total a pagar
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums leading-none text-panel-ink">
          {formatBRL(total - credito)}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <Linha rotulo="Pago" valor={formatBRL(pago)} />
        {falta > 0 && (
          <Linha rotulo="Falta" valor={formatBRL(falta)} tom="atencao" />
        )}
        {troco > 0 && (
          <Linha rotulo="Troco" valor={formatBRL(troco)} tom="positivo" />
        )}

        {erro && <Alerta tone="erro">{erro}</Alerta>}

        <Button
          className="h-14 w-full text-base"
          onClick={onFinalizar}
          disabled={!podeFinalizar}
        >
          {enviando ? "Finalizando…" : "Finalizar venda"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancelar}>
          Cancelar venda
        </Button>
      </div>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string;
  tom?: "neutro" | "accent" | "atencao" | "positivo";
}) {
  const tons = {
    neutro: "text-panel-ink",
    accent: "text-panel-accent font-medium",
    atencao: "text-amber-700 font-medium",
    positivo: "text-emerald-700 font-medium",
  };
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-panel-inkSoft">{rotulo}</span>
      <span className={`tabular-nums ${tons[tom]}`}>{valor}</span>
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
      <PageHeader
        title="Venda concluída"
        subtitle={`Pedido #${venda.id.slice(0, 8).toUpperCase()}`}
      />

      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-panel-border bg-panel-surface shadow-card">
        <div className="border-b border-panel-border bg-emerald-50 px-6 py-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
          </span>
          <p className="text-4xl font-bold tabular-nums text-emerald-900">
            {formatBRL(venda.total)}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {venda.pagamentos.map((p, i) => (
              <Badge key={i} tone="green">
                {p.metodo}
                {p.parcelas > 1 && ` ${p.parcelas}x`} · {formatBRL(p.valor)}
              </Badge>
            ))}
          </div>
        </div>

        {/* O troco é o que a pessoa precisa ler em voz alta — destaque próprio. */}
        {troco > 0 && (
          <div className="border-b border-panel-border bg-amber-50 px-6 py-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Troco a devolver
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-amber-900">
              {formatBRL(troco)}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 px-6 py-6">
          <Button className="h-14 text-base" onClick={onNovaVenda}>
            Nova venda
          </Button>
          <a
            href={`/admin/recibo/${venda.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center justify-center rounded-xl border border-panel-borderStrong text-sm font-medium text-panel-inkSoft transition hover:border-panel-accent hover:text-panel-accent"
          >
            Imprimir recibo ↗
          </a>
        </div>
      </div>
    </div>
  );
}
