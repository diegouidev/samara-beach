"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { Fornecedor } from "@/lib/types";

export default function FornecedoresPage() {
  return (
    <RequireAuth papeis={["admin", "estoque", "financeiro"]}>
      <FornecedoresContent />
    </RequireAuth>
  );
}

function FornecedoresContent() {
  const [lista, setLista] = useState<Fornecedor[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    api
      .listarFornecedores()
      .then(setLista)
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${lista.length} cadastrado(s)`}
        action={
          <Button onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Novo fornecedor"}
          </Button>
        }
      />

      {mostrarForm && (
        <Card className="mb-6">
          <NovoFornecedorForm
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
        ) : lista.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            Nenhum fornecedor cadastrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-panel-border text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Contato</th>
                <th className="px-5 py-3">CNPJ</th>
                <th className="px-5 py-3">Prazo</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} className="border-b border-panel-border last:border-0">
                  <td className="px-5 py-3 font-medium text-panel-ink">{f.nome}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {f.contato_nome || "—"}
                    {f.email && <div className="text-xs text-slate-400">{f.email}</div>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{f.cnpj || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {f.prazo_medio_entrega_dias
                      ? `${f.prazo_medio_entrega_dias} dias`
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={f.ativo ? "green" : "red"}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </Badge>
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

function NovoFornecedorForm({ onCriado }: { onCriado: () => void }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [prazo, setPrazo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.criarFornecedor({
        nome,
        cnpj,
        contato_nome: contato,
        email,
        prazo_medio_entrega_dias: prazo ? Number(prazo) : null,
      });
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome">
          <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="CNPJ">
          <input className={inputClass} value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </Field>
        <Field label="Contato">
          <input className={inputClass} value={contato} onChange={(e) => setContato(e.target.value)} />
        </Field>
        <Field label="E-mail">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Prazo médio (dias)">
          <input className={inputClass} type="number" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </Field>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Cadastrar"}
      </Button>
    </form>
  );
}
