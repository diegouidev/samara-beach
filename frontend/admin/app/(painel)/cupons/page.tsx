"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
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
import { formatBRL, formatData } from "@/lib/format";
import type { Cupom } from "@/lib/types";

export default function CuponsPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <CuponsContent />
    </RequireAuth>
  );
}

function CuponsContent() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    api
      .listarCupons()
      .then(setCupons)
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function alternarAtivo(c: Cupom) {
    await api.atualizarCupom(c.id, { ativo: !c.ativo });
    carregar();
  }

  return (
    <div>
      <PageHeader
        title="Cupons"
        subtitle={`${cupons.length} cupom(ns)`}
        action={
          <Button onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Novo cupom"}
          </Button>
        }
      />

      {mostrarForm && (
        <Card className="mb-6">
          <NovoCupomForm
            onCriado={() => {
              setMostrarForm(false);
              carregar();
            }}
          />
        </Card>
      )}

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : cupons.length === 0 ? (
          <EmptyState titulo={"Nenhum cupom cadastrado."} />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Validade</th>
                <th>Usos</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-medium">{c.codigo}</td>
                  <td className="capitalize">{c.tipo}</td>
                  <td>
                    {c.tipo === "percentual"
                      ? `${c.valor}%`
                      : formatBRL(c.valor)}
                  </td>
                  <td>
                    {c.validade ? formatData(c.validade) : "—"}
                  </td>
                  <td>
                    {c.usos}
                    {c.uso_maximo ? ` / ${c.uso_maximo}` : ""}
                  </td>
                  <td>
                    <Badge tone={c.ativo ? "green" : "red"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => alternarAtivo(c)}
                      className="text-panel-accent hover:underline"
                    >
                      {c.ativo ? "Desativar" : "Ativar"}
                    </button>
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

/** Prazos usuais de campanha — evita abrir o calendário para o caso comum. */
const PRAZOS = [
  { dias: 7, label: "7 dias" },
  { dias: 15, label: "15 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "3 meses" },
];

function emDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function NovoCupomForm({ onCriado }: { onCriado: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"percentual" | "fixo">("percentual");
  const [valor, setValor] = useState("");
  const [usoMaximo, setUsoMaximo] = useState("");
  const [validade, setValidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.criarCupom({
        codigo: codigo.toUpperCase().trim(),
        tipo,
        valor,
        uso_maximo: usoMaximo ? Number(usoMaximo) : null,
        // A API espera datetime; sem hora, o cupom morreria à meia-noite do
        // dia escolhido — aqui ele vale até o fim daquele dia.
        validade: validade ? `${validade}T23:59:59` : null,
        ativo: true,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar cupom.");
    } finally {
      setEnviando(false);
    }
  }

  const percentualInvalido =
    tipo === "percentual" && Number(valor) > 100;

  return (
    <form onSubmit={salvar} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Código" hint="Vira maiúsculo automaticamente.">
          <input
            className={`${inputClass} font-mono uppercase`}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="VERAO10"
            required
            autoFocus
          />
        </Field>
        <Field label="Tipo de desconto">
          <select
            className={inputClass}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "percentual" | "fixo")}
          >
            <option value="percentual">Percentual (%)</option>
            <option value="fixo">Valor fixo (R$)</option>
          </select>
        </Field>
        <Field
          label={tipo === "percentual" ? "Percentual" : "Valor"}
          hint={percentualInvalido ? "Máximo 100%." : undefined}
        >
          <div className="flex items-center rounded-xl border border-panel-borderStrong bg-panel-surface transition focus-within:border-panel-accent focus-within:ring-2 focus-within:ring-panel-accent/25">
            {tipo === "fixo" && (
              <span className="pl-3 text-sm text-panel-inkMuted">R$</span>
            )}
            <input
              className="h-10 w-full bg-transparent px-3 text-sm tabular-nums text-panel-ink focus:outline-none"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(",", "."))}
              placeholder={tipo === "percentual" ? "10" : "20,00"}
              inputMode="decimal"
              required
            />
            {tipo === "percentual" && (
              <span className="pr-3 text-sm text-panel-inkMuted">%</span>
            )}
          </div>
        </Field>
        <Field label="Uso máximo" hint="Vazio = sem limite.">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={usoMaximo}
            onChange={(e) => setUsoMaximo(e.target.value)}
            placeholder="Ilimitado"
          />
        </Field>
      </div>

      {/* Validade com atalhos: o caso comum é "vale por 30 dias", não uma
          data específica no calendário. */}
      <div>
        <span className="text-[13px] font-medium text-panel-inkSoft">
          Validade
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {PRAZOS.map((p) => {
            const data = emDias(p.dias);
            const ativo = validade === data;
            return (
              <button
                key={p.dias}
                type="button"
                onClick={() => setValidade(ativo ? "" : data)}
                className={`h-10 rounded-xl border px-4 text-sm font-medium transition ${
                  ativo
                    ? "border-panel-accent bg-panel-accent text-white"
                    : "border-panel-border text-panel-inkSoft hover:border-panel-borderStrong hover:bg-panel-surfaceMuted"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <input
            type="date"
            className={`${inputClass} w-44`}
            value={validade}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setValidade(e.target.value)}
          />
          {validade && (
            <button
              type="button"
              onClick={() => setValidade("")}
              className="text-xs font-medium text-panel-inkMuted transition hover:text-panel-ink"
            >
              Sem prazo
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-panel-inkMuted">
          {validade
            ? `Válido até ${formatData(validade)}, no fim do dia.`
            : "Sem data, o cupom vale por tempo indeterminado."}
        </p>
      </div>

      {erro && <Alerta tone="erro">{erro}</Alerta>}

      <Button type="submit" disabled={enviando || percentualInvalido}>
        {enviando ? "Salvando…" : "Criar cupom"}
      </Button>
    </form>
  );
}
