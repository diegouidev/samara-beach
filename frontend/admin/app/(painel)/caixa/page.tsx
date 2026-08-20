"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL, formatData } from "@/lib/format";
import { Alerta, Badge, Button, Card, EmptyState, Field, PageHeader, Stat, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { IconeCaixa } from "@/components/ui/icons";
import type { ResumoCaixa, SessaoCaixa } from "@/lib/types";

const METODO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
  outros: "Outros",
};

const TIPO_LABEL: Record<string, string> = {
  abertura: "Abertura",
  venda: "Venda",
  sangria: "Sangria",
  suprimento: "Suprimento",
  devolucao: "Devolução",
};

export default function CaixaPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <CaixaContent />
    </RequireAuth>
  );
}

function CaixaContent() {
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null);
  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [historico, setHistorico] = useState<SessaoCaixa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      const [atual, sessoes] = await Promise.all([
        api.caixaAtual(),
        api.listarSessoesCaixa(),
      ]);
      setSessao(atual.sessao);
      setResumo(atual.resumo ?? null);
      setHistorico(sessoes.filter((s) => s.status === "fechada").slice(0, 10));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar o caixa.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function avisar(texto: string) {
    setMsg(texto);
    setTimeout(() => setMsg(null), 4000);
  }

  if (carregando) return <p className="text-slate-400">Carregando…</p>;

  return (
    <div>
      <PageHeader
        title="Caixa"
        subtitle={
          sessao
            ? `Aberto em ${new Date(sessao.aberta_em).toLocaleString("pt-BR")}`
            : "Nenhum caixa aberto no momento"
        }
        action={
          sessao ? (
            <Link href="/pdv">
              <Button>Ir para o PDV</Button>
            </Link>
          ) : undefined
        }
      />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}
      {erro && (
        <Alerta tone="erro">{erro}</Alerta>
      )}

      {!sessao ? (
        <AbrirCaixaCard
          onAberto={() => {
            avisar("Caixa aberto. Bom trabalho!");
            carregar();
          }}
        />
      ) : (
        <CaixaAberto
          sessao={sessao}
          resumo={resumo}
          onMudou={(r, texto) => {
            setResumo(r);
            if (texto) avisar(texto);
          }}
          onFechado={() => {
            avisar("Caixa fechado.");
            carregar();
          }}
          onErro={setErro}
        />
      )}

      {historico.length > 0 && (
        <Card bare className="mt-6">
          <h2 className="border-b border-panel-border px-5 py-3 font-semibold text-panel-ink">
            Fechamentos anteriores
          </h2>
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Operador</th>
                <th>Abertura</th>
                <th>Fechamento</th>
                <th className="text-right">Esperado</th>
                <th className="text-right">Contado</th>
                <th className="text-right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((s) => {
                const dif = Number(s.diferenca ?? 0);
                return (
                  <tr key={s.id}>
                    <td>{s.operador_nome}</td>
                    <td className="text-slate-600">
                      {formatData(s.aberta_em)}
                    </td>
                    <td className="text-slate-600">
                      {s.fechada_em ? formatData(s.fechada_em) : "—"}
                    </td>
                    <td className="text-right">
                      {formatBRL(s.valor_fechamento_esperado ?? 0)}
                    </td>
                    <td className="text-right">
                      {formatBRL(s.valor_fechamento_informado ?? 0)}
                    </td>
                    <td className="text-right">
                      <Badge
                        tone={dif === 0 ? "green" : dif > 0 ? "amber" : "red"}
                      >
                        {dif === 0
                          ? "confere"
                          : `${dif > 0 ? "sobra" : "falta"} ${formatBRL(Math.abs(dif))}`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AbrirCaixaCard({ onAberto }: { onAberto: () => void }) {
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function abrir() {
    setErro(null);
    setEnviando(true);
    try {
      await api.abrirCaixa((Number(valor) || 0).toFixed(2), obs);
      onAberto();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao abrir o caixa.");
    } finally {
      setEnviando(false);
    }
  }

  const numero = Number(valor) || 0;

  return (
    <div className="mx-auto max-w-xl">
      <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel-surface shadow-card">
        {/* Faixa da marca: o começo do turno merece um marco visual. */}
        <div className="flex items-center gap-4 border-b border-panel-border bg-panel-accent/5 px-7 py-6">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-panel-accent/10 text-panel-accent">
            <IconeCaixa className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-panel-ink">
              Abrir o caixa
            </h2>
            <p className="text-sm text-panel-inkSoft">
              Conte o troco da gaveta antes de começar a vender.
            </p>
          </div>
        </div>

        <div className="space-y-6 px-7 py-7">
          <div>
            <label
              htmlFor="troco-inicial"
              className="text-[13px] font-medium text-panel-inkSoft"
            >
              Troco inicial
            </label>
            {/* Campo grande: é o único número desta tela, e vai ser digitado
                tanto no teclado quanto no toque. */}
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-panel-borderStrong bg-panel-surface px-5 transition focus-within:border-panel-accent focus-within:ring-4 focus-within:ring-panel-accent/15">
              <span className="text-2xl font-medium text-panel-inkMuted">
                R$
              </span>
              <input
                id="troco-inicial"
                className="h-16 w-full bg-transparent text-3xl font-semibold tabular-nums text-panel-ink placeholder:text-panel-inkMuted/50 focus:outline-none"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(",", "."))}
                placeholder="0,00"
                inputMode="decimal"
                autoFocus
              />
            </div>

            {/* Atalhos para os valores de sempre — evita digitar no tablet. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[50, 100, 150, 200, 300].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValor(String(v))}
                  className={`h-11 min-w-[72px] rounded-xl border px-4 text-sm font-medium transition ${
                    numero === v
                      ? "border-panel-accent bg-panel-accent text-white"
                      : "border-panel-border text-panel-inkSoft hover:border-panel-borderStrong hover:bg-panel-surfaceMuted"
                  }`}
                >
                  {formatBRL(v)}
                </button>
              ))}
            </div>
          </div>

          <Field label="Observações (opcional)">
            <input
              className={inputClass}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: troco conferido com a gerente"
            />
          </Field>

          {erro && <Alerta tone="erro">{erro}</Alerta>}

          <Button
            className="h-14 w-full text-base"
            onClick={abrir}
            disabled={enviando}
          >
            {enviando ? "Abrindo…" : `Abrir caixa com ${formatBRL(numero)}`}
          </Button>

          <p className="text-center text-xs text-panel-inkMuted">
            Este valor entra na conferência do fechamento do turno.
          </p>
        </div>
      </div>
    </div>
  );
}

function CaixaAberto({
  sessao,
  resumo,
  onMudou,
  onFechado,
  onErro,
}: {
  sessao: SessaoCaixa;
  resumo: ResumoCaixa | null;
  onMudou: (r: ResumoCaixa, texto?: string) => void;
  onFechado: () => void;
  onErro: (e: string) => void;
}) {
  const [fechando, setFechando] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Vendas do turno" value={String(resumo?.num_vendas ?? 0)} />
        <Stat
          label="Total vendido"
          value={formatBRL(resumo?.total_vendido ?? 0)}
        />
        <Stat
          label="Ticket médio"
          value={formatBRL(resumo?.ticket_medio ?? 0)}
        />
        <Stat
          label="Dinheiro em gaveta"
          value={formatBRL(resumo?.dinheiro_esperado ?? 0)}
          hint={`Abertura ${formatBRL(sessao.valor_abertura)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-semibold text-panel-ink">
            Por forma de pagamento
          </h2>
          {resumo && Object.keys(resumo.por_metodo).length > 0 ? (
            <ul className="divide-y divide-panel-border text-sm">
              {Object.entries(resumo.por_metodo).map(([metodo, valor]) => (
                <li key={metodo} className="flex justify-between py-2">
                  <span className="text-slate-600">
                    {METODO_LABEL[metodo] ?? metodo}
                  </span>
                  <span className="font-medium">{formatBRL(valor)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma venda ainda.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-panel-ink">Gaveta</h2>
          <MovimentoGaveta
            sessaoId={sessao.id}
            onMovimentado={onMudou}
            onErro={onErro}
          />
          <div className="mt-4 border-t border-panel-border pt-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Sangrias</span>
              <span>{formatBRL(resumo?.total_sangrias ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Suprimentos</span>
              <span>{formatBRL(resumo?.total_suprimentos ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Devoluções</span>
              <span>{formatBRL(resumo?.total_devolucoes ?? 0)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-panel-ink">Fechamento</h2>
          {fechando ? (
            <FecharCaixaForm
              sessaoId={sessao.id}
              esperado={Number(resumo?.dinheiro_esperado ?? 0)}
              onCancelar={() => setFechando(false)}
              onFechado={onFechado}
            />
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Ao fechar, conte o dinheiro da gaveta e informe o valor. O
                sistema compara com o esperado de{" "}
                <strong>{formatBRL(resumo?.dinheiro_esperado ?? 0)}</strong>{" "}
                (cartão e PIX não entram na contagem).
              </p>
              <Button className="mt-3" onClick={() => setFechando(true)}>
                Fechar caixa
              </Button>
            </>
          )}
        </Card>
      </div>

      <Card bare>
        <h2 className="border-b border-panel-border px-5 py-3 font-semibold text-panel-ink">
          Extrato do turno
        </h2>
        {!resumo || resumo.movimentos.length === 0 ? (
          <EmptyState titulo={"Nenhum movimento."} />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Forma</th>
                <th>Motivo</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {resumo.movimentos.map((m) => (
                <tr key={m.id}>
                  <td className="text-slate-500">
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                  <td className="text-slate-500">
                    {METODO_LABEL[m.metodo_pagamento] ?? "—"}
                  </td>
                  <td className="text-slate-500">{m.motivo}</td>
                  <td
                    className={`px-5 py-2 text-right font-medium ${
                      Number(m.valor) < 0 ? "text-red-600" : "text-panel-ink"
                    }`}
                  >
                    {formatBRL(m.valor)}
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

function MovimentoGaveta({
  sessaoId,
  onMovimentado,
  onErro,
}: {
  sessaoId: string;
  onMovimentado: (r: ResumoCaixa, texto?: string) => void;
  onErro: (e: string) => void;
}) {
  const [tipo, setTipo] = useState<"sangria" | "suprimento">("sangria");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function registrar() {
    setEnviando(true);
    try {
      const r = await api.movimentarGaveta(
        sessaoId,
        tipo,
        (Number(valor) || 0).toFixed(2),
        motivo,
      );
      onMovimentado(r, tipo === "sangria" ? "Sangria registrada." : "Suprimento registrado.");
      setValor("");
      setMotivo("");
    } catch (e) {
      onErro(e instanceof Error ? e.message : "Erro no movimento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["sangria", "suprimento"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
              tipo === t
                ? "border-panel-accent bg-panel-accent text-white"
                : "border-panel-border text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        className={inputClass}
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(",", "."))}
        placeholder="Valor (R$)"
        inputMode="decimal"
      />
      <input
        className={inputClass}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder={
          tipo === "sangria" ? "Motivo (ex.: depósito)" : "Motivo (ex.: troco)"
        }
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={registrar}
        disabled={enviando || !valor || !motivo.trim()}
      >
        {enviando ? "Registrando…" : "Registrar"}
      </Button>
    </div>
  );
}

function FecharCaixaForm({
  sessaoId,
  esperado,
  onFechado,
  onCancelar,
}: {
  sessaoId: string;
  esperado: number;
  onFechado: () => void;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const diferenca = valor ? Number(valor) - esperado : 0;

  async function fechar() {
    setErro(null);
    setEnviando(true);
    try {
      await api.fecharCaixa(sessaoId, (Number(valor) || 0).toFixed(2), obs);
      onFechado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao fechar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Dinheiro contado na gaveta (R$)">
        <input
          className={inputClass}
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(",", "."))}
          placeholder={esperado.toFixed(2)}
          inputMode="decimal"
          autoFocus
        />
      </Field>

      {valor !== "" && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            Math.abs(diferenca) < 0.005
              ? "bg-emerald-50 text-emerald-700"
              : diferenca > 0
                ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-600"
          }`}
        >
          {Math.abs(diferenca) < 0.005
            ? "Confere com o esperado."
            : diferenca > 0
              ? `Sobra de ${formatBRL(diferenca)}`
              : `Falta ${formatBRL(Math.abs(diferenca))}`}
        </p>
      )}

      <Field label="Observações">
        <input
          className={inputClass}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Justificativa da diferença, se houver"
        />
      </Field>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <Button onClick={fechar} disabled={enviando || valor === ""}>
          {enviando ? "Fechando…" : "Confirmar fechamento"}
        </Button>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
