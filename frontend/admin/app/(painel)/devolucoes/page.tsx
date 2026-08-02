"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  inputClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type {
  Devolucao,
  ItemDevolvivel,
  SessaoCaixa,
  VendaPDV,
} from "@/lib/types";

export default function DevolucoesPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <DevolucoesContent />
    </RequireAuth>
  );
}

function DevolucoesContent() {
  const router = useRouter();
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [vendas, setVendas] = useState<VendaPDV[]>([]);
  const [historico, setHistorico] = useState<Devolucao[]>([]);
  const [selecionada, setSelecionada] = useState<VendaPDV | null>(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function carregar() {
    try {
      const [atual, listaVendas, listaDevolucoes] = await Promise.all([
        api.caixaAtual(),
        api.listarVendasPDV(),
        api.listarDevolucoes(),
      ]);
      setSessao(atual.sessao);
      setVendas(listaVendas.filter((v) => v.status !== "cancelado"));
      setHistorico(listaDevolucoes.slice(0, 10));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return vendas.slice(0, 20);
    return vendas.filter(
      (v) =>
        v.id.toLowerCase().startsWith(termo) ||
        v.cliente_nome?.toLowerCase().includes(termo),
    );
  }, [vendas, busca]);

  if (carregando) return <p className="text-panel-inkMuted">Carregando…</p>;

  if (!sessao) {
    return (
      <div>
        <PageHeader title="Trocas e devoluções" subtitle="Loja física" />
        <Card>
          <EmptyState
            titulo="Nenhum caixa aberto"
            descricao="A devolução mexe no caixa e no estoque — abra o caixa para registrar."
            acao={
              <Link href="/caixa">
                <Button>Abrir caixa</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Trocas e devoluções"
        subtitle="Devolva itens de uma venda do balcão — inteira ou em parte"
        action={
          <Link href="/pdv">
            <Button variant="outline">Ir para o PDV</Button>
          </Link>
        }
      />

      {msg && <Alerta tone="sucesso">{msg}</Alerta>}
      {erro && <Alerta tone="erro">{erro}</Alerta>}

      {selecionada ? (
        <FormDevolucao
          venda={selecionada}
          onCancelar={() => setSelecionada(null)}
          onConcluida={(devolucao) => {
            setSelecionada(null);
            carregar();
            if (devolucao.tipo === "troca") {
              // A troca continua no PDV, com o crédito já aplicado.
              router.push(`/pdv?credito=${devolucao.id}`);
              return;
            }
            setMsg(
              `Devolução registrada. ${formatBRL(devolucao.valor_total)} saíram do caixa.`,
            );
            setTimeout(() => setMsg(null), 5000);
          }}
        />
      ) : (
        <Card title="Escolha a venda" bare>
          <div className="border-b border-panel-border p-4">
            <input
              className={inputClass}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo número do pedido ou nome do cliente…"
              autoFocus
            />
          </div>
          {filtradas.length === 0 ? (
            <EmptyState
              titulo="Nenhuma venda encontrada"
              descricao="Só vendas do balcão que ainda não foram canceladas aparecem aqui."
            />
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v) => (
                  <tr key={v.id}>
                    <td className="font-mono text-xs">
                      #{v.id.slice(0, 8)}
                    </td>
                    <td>{formatData(v.created_at)}</td>
                    <td>{v.cliente_nome || "Consumidor final"}</td>
                    <td>{v.itens.length}</td>
                    <td className="tabular text-right font-medium text-panel-ink">
                      {formatBRL(v.total)}
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => setSelecionada(v)}
                      >
                        Devolver itens
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {historico.length > 0 && !selecionada && (
        <Card className="mt-6" title="Últimas devoluções" bare>
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Itens</th>
                <th>Motivo</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((d) => (
                <tr key={d.id}>
                  <td>{formatData(d.created_at)}</td>
                  <td>
                    <Badge tone={d.tipo === "troca" ? "blue" : "amber"} dot>
                      {d.tipo === "troca" ? "Troca" : "Devolução"}
                    </Badge>
                  </td>
                  <td className="text-xs">
                    {d.itens.map((i) => (
                      <span key={i.id} className="block">
                        {i.quantidade}x {i.produto_nome}
                      </span>
                    ))}
                  </td>
                  <td>{d.motivo}</td>
                  <td className="tabular text-right">
                    {formatBRL(d.valor_total)}
                    {Number(d.credito_disponivel) > 0 && (
                      <span className="block text-xs text-panel-accent">
                        crédito de {formatBRL(d.credito_disponivel)} em aberto
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FormDevolucao({
  venda,
  onConcluida,
  onCancelar,
}: {
  venda: VendaPDV;
  onConcluida: (d: Devolucao) => void;
  onCancelar: () => void;
}) {
  const [itens, setItens] = useState<ItemDevolvivel[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api
      .itensDevolviveis(venda.id)
      .then(setItens)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"));
  }, [venda.id]);

  const total = itens.reduce(
    (acc, i) => acc + (quantidades[i.id] ?? 0) * Number(i.preco_unitario),
    0,
  );
  const selecionados = Object.values(quantidades).filter((q) => q > 0).length;

  async function registrar(tipo: "devolucao" | "troca") {
    setErro(null);
    setEnviando(true);
    try {
      const devolucao = await api.registrarDevolucao({
        pedido: venda.id,
        itens: Object.entries(quantidades)
          .filter(([, q]) => q > 0)
          .map(([item, quantidade]) => ({ item, quantidade })),
        tipo,
        motivo,
      });
      onConcluida(devolucao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card
      title={`Pedido #${venda.id.slice(0, 8)}`}
      subtitle={`${formatData(venda.created_at)} · ${venda.cliente_nome || "Consumidor final"} · ${formatBRL(venda.total)}`}
      action={
        <Button variant="ghost" onClick={onCancelar}>
          Voltar
        </Button>
      }
    >
      <table className="tabela">
        <thead>
          <tr>
            <th>Item</th>
            <th>Vendido</th>
            <th>Já devolvido</th>
            <th className="text-right">Preço</th>
            <th className="w-32">Devolver</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="font-medium text-panel-ink">
                  {item.produto_nome}
                </span>
                <span className="block font-mono text-xs text-panel-inkMuted">
                  {item.sku}
                </span>
              </td>
              <td>{item.quantidade}</td>
              <td>{item.devolvida || "—"}</td>
              <td className="tabular text-right">
                {formatBRL(item.preco_unitario)}
              </td>
              <td>
                {item.disponivel > 0 ? (
                  <input
                    type="number"
                    className={inputClass}
                    min={0}
                    max={item.disponivel}
                    value={quantidades[item.id] ?? 0}
                    onChange={(e) =>
                      setQuantidades((prev) => ({
                        ...prev,
                        [item.id]: Math.max(
                          0,
                          Math.min(item.disponivel, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                  />
                ) : (
                  <span className="text-xs text-panel-inkMuted">
                    tudo devolvido
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-4">
        <Field label="Motivo">
          <input
            className={inputClass}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Tamanho errado, defeito, arrependimento…"
            required
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-panel-surfaceMuted px-4 py-3">
          <span className="text-sm text-panel-inkSoft">
            {selecionados === 0
              ? "Nenhum item selecionado"
              : `${selecionados} item(ns) selecionado(s)`}
          </span>
          <span className="tabular text-lg font-semibold text-panel-ink">
            {formatBRL(total)}
          </span>
        </div>

        {erro && <Alerta tone="erro">{erro}</Alerta>}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => registrar("devolucao")}
            disabled={enviando || total <= 0 || !motivo.trim()}
          >
            Devolver dinheiro
          </Button>
          <Button
            variant="outline"
            onClick={() => registrar("troca")}
            disabled={enviando || total <= 0 || !motivo.trim()}
          >
            Trocar por outro produto
          </Button>
        </div>
        <p className="text-xs text-panel-inkMuted">
          Na devolução o valor sai da gaveta na hora. Na troca, ele vira crédito
          e você segue para o PDV para escolher a peça nova.
        </p>
      </div>
    </Card>
  );
}
