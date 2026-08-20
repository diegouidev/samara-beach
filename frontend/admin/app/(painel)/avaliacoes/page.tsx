"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import {
  Alerta,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { formatData } from "@/lib/format";
import type { Avaliacao } from "@/lib/types";

export default function AvaliacoesPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <AvaliacoesContent />
    </RequireAuth>
  );
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(nota)}
      <span className="text-slate-300">{"★".repeat(5 - nota)}</span>
    </span>
  );
}

function AvaliacoesContent() {
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [filtro, setFiltro] = useState<"pendentes" | "todas">("pendentes");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Avaliacao | null>(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    const params: Record<string, string> =
      filtro === "pendentes" ? { aprovada: "false" } : {};
    api
      .listarAvaliacoes(params)
      .then(setLista)
      .catch((e) =>
        setErro(e instanceof Error ? e.message : "Erro ao carregar."),
      )
      .finally(() => setCarregando(false));
  }, [filtro]);

  useEffect(carregar, [carregar]);

  async function moderar(id: string, aprovada: boolean) {
    setErro(null);
    try {
      await api.moderarAvaliacao(id, aprovada);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível moderar.");
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessando(true);
    try {
      await api.excluirAvaliacao(excluindo.id);
      setExcluindo(null);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível excluir.");
    } finally {
      setProcessando(false);
    }
  }

  const pendentes = lista.filter((a) => !a.aprovada).length;

  return (
    <div>
      <PageHeader
        title="Avaliações"
        subtitle="Nada aparece na loja sem passar por aqui"
        action={
          <div className="flex gap-1 rounded-xl bg-panel-surfaceMuted p-1 text-sm">
            {(["pendentes", "todas"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`rounded-lg px-3.5 py-1.5 capitalize transition ${
                  filtro === f
                    ? "bg-panel-surface font-medium text-panel-ink shadow-sm"
                    : "text-panel-inkMuted hover:text-panel-ink"
                }`}
              >
                {f}
                {f === "pendentes" && pendentes > 0 && filtro !== "pendentes" && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-800">
                    {pendentes}
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      />

      {erro && <Alerta tone="erro">{erro}</Alerta>}

      {carregando ? (
        <EmptyState titulo="Carregando…" />
      ) : lista.length === 0 ? (
        <Card>
          <EmptyState
            titulo={
              filtro === "pendentes"
                ? "Nenhuma avaliação esperando"
                : "Nenhuma avaliação ainda"
            }
            descricao={
              filtro === "pendentes"
                ? "Tudo que os clientes enviaram já foi moderado."
                : "As avaliações enviadas pela loja aparecem aqui."
            }
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {lista.map((a) => (
            <li key={a.id}>
              <CartaoAvaliacao
                avaliacao={a}
                onModerar={moderar}
                onExcluir={() => setExcluindo(a)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Janela própria em vez do confirm() do navegador: dá para dizer o que
          se perde e manter a linguagem do sistema. */}
      <Modal
        aberto={excluindo !== null}
        titulo="Excluir avaliação"
        subtitulo={
          excluindo ? `Avaliação de ${excluindo.produto_nome}` : undefined
        }
        largura="max-w-md"
        onFechar={() => setExcluindo(null)}
      >
        <p className="text-sm text-panel-inkSoft">
          A avaliação será apagada em definitivo. Se a intenção é só tirá-la da
          loja, use <strong>Ocultar</strong> — assim ela continua no histórico.
        </p>
        {excluindo?.comentario && (
          <p className="mt-3 rounded-xl bg-panel-surfaceMuted px-4 py-3 text-sm italic text-panel-inkSoft">
            “{excluindo.comentario}”
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmarExclusao}
            disabled={processando}
          >
            {processando ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Uma avaliação para moderar. O produto vem primeiro: sem ele, aprovar é um
 * chute — era exatamente o que a tela pedia antes.
 */
function CartaoAvaliacao({
  avaliacao: a,
  onModerar,
  onExcluir,
}: {
  avaliacao: Avaliacao;
  onModerar: (id: string, aprovada: boolean) => void;
  onExcluir: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border bg-panel-surface p-5 shadow-card transition ${
        a.aprovada ? "border-panel-border" : "border-amber-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Produto avaliado — o contexto que faltava. */}
          <Link
            href={`/produtos/${a.produto_slug}`}
            className="font-medium text-panel-ink transition hover:text-panel-accent"
          >
            {a.produto_nome || "Produto removido"}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Estrelas nota={a.nota} />
            <span className="text-sm text-panel-inkSoft">
              {a.cliente_nome || "Cliente"}
            </span>
            <span className="text-xs text-panel-inkMuted">
              {formatData(a.created_at)}
            </span>
            <Badge tone={a.aprovada ? "green" : "amber"} dot>
              {a.aprovada ? "Na loja" : "Aguardando"}
            </Badge>
          </div>

          {a.comentario ? (
            <p className="mt-3 text-sm leading-relaxed text-panel-inkSoft">
              {a.comentario}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-panel-inkMuted">
              Nota sem comentário.
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 gap-2">
          {a.aprovada ? (
            <Button variant="outline" onClick={() => onModerar(a.id, false)}>
              Ocultar
            </Button>
          ) : (
            <Button onClick={() => onModerar(a.id, true)}>Aprovar</Button>
          )}
          <Button variant="ghost" onClick={onExcluir}>
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
