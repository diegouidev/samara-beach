"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
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

      <Card className="p-0">
        {carregando ? (
          <p className="p-6 text-sm text-slate-400">Carregando…</p>
        ) : cupons.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Nenhum cupom cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-panel-border text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Validade</th>
                <th className="px-5 py-3">Usos</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id} className="border-b border-panel-border last:border-0">
                  <td className="px-5 py-3 font-mono font-medium">{c.codigo}</td>
                  <td className="px-5 py-3 capitalize">{c.tipo}</td>
                  <td className="px-5 py-3">
                    {c.tipo === "percentual"
                      ? `${c.valor}%`
                      : formatBRL(c.valor)}
                  </td>
                  <td className="px-5 py-3">
                    {c.validade ? formatData(c.validade) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {c.usos}
                    {c.uso_maximo ? ` / ${c.uso_maximo}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={c.ativo ? "green" : "red"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
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
