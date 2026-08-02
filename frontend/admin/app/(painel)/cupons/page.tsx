"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
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
        )}
      </Card>
    </div>
  );
}

function NovoCupomForm({ onCriado }: { onCriado: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"percentual" | "fixo">("percentual");
  const [valor, setValor] = useState("");
  const [usoMaximo, setUsoMaximo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.criarCupom({
        codigo: codigo.toUpperCase(),
        tipo,
        valor,
        uso_maximo: usoMaximo ? Number(usoMaximo) : null,
        ativo: true,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar cupom.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Código">
          <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="VERAO10" required />
        </Field>
        <Field label="Tipo">
          <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value as "percentual" | "fixo")}>
            <option value="percentual">Percentual (%)</option>
            <option value="fixo">Valor fixo (R$)</option>
          </select>
        </Field>
        <Field label={tipo === "percentual" ? "Percentual" : "Valor (R$)"}>
          <input className={inputClass} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "percentual" ? "10" : "20.00"} required />
        </Field>
        <Field label="Uso máximo (opcional)">
          <input className={inputClass} type="number" value={usoMaximo} onChange={(e) => setUsoMaximo(e.target.value)} />
        </Field>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Criar cupom"}
      </Button>
    </form>
  );
}
