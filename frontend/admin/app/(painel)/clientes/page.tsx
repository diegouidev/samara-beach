"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL, formatData } from "@/lib/format";
import { Alerta, Button, Card, EmptyState, PageHeader, Stat, inputClass } from "@/components/ui";
import { ClienteModal } from "@/components/clientes/ClienteModal";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { ClienteAdmin } from "@/lib/types";

export default function ClientesPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <ClientesContent />
    </RequireAuth>
  );
}

function ClientesContent() {
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState<ClienteAdmin | null>(null);
  const [cadastrando, setCadastrando] = useState(false);

  function carregar() {
    api
      .listarClientes()
      .then(setClientes)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((c) =>
      [c.nome, c.email, c.cpf, c.telefone]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(termo)),
    );
  }, [clientes, busca]);

  const compradores = clientes.filter((c) => c.total_pedidos > 0).length;
  const receita = clientes.reduce((acc, c) => acc + Number(c.total_gasto ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Base de clientes cadastrados na loja"
        action={
          <Button onClick={() => setCadastrando(true)}>+ Novo cliente</Button>
        }
      />

      {erro && (
        <Alerta tone="erro">{erro}</Alerta>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Cadastrados" value={String(clientes.length)} />
        <Stat
          label="Já compraram"
          value={String(compradores)}
          hint={
            clientes.length > 0
              ? `${Math.round((compradores / clientes.length) * 100)}% da base`
              : undefined
          }
        />
        <Stat label="Receita da base" value={formatBRL(receita)} />
      </div>

      <Card className="mb-4">
        <input
          className={inputClass}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail, CPF ou telefone…"
        />
      </Card>

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : filtrados.length === 0 ? (
          <EmptyState titulo={clientes.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : "Nenhum cliente encontrado."} />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Cadastro</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right">Total gasto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td>
                      <div className="font-medium text-panel-ink">{c.nome}</div>
                      {c.cpf && (
                        <div className="text-xs text-slate-400">CPF {c.cpf}</div>
                      )}
                    </td>
                    <td className="text-slate-600">
                      {c.email}
                      {c.telefone && (
                        <div className="text-xs text-slate-400">
                          {c.telefone}
                        </div>
                      )}
                    </td>
                    <td className="text-slate-600">
                      {formatData(c.created_at)}
                    </td>
                    <td className="text-right">{c.total_pedidos}</td>
                    <td className="text-right font-medium">
                      {formatBRL(c.total_gasto ?? 0)}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => setEditando(c)}
                          className="text-panel-accent hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setAberto(aberto === c.id ? null : c.id)}
                          className="text-slate-500 hover:underline"
                        >
                          {aberto === c.id ? "Fechar" : "Endereços"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {aberto === c.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-5 py-3">
                        {c.enderecos.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            Nenhum endereço cadastrado.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-sm text-slate-600">
                            {c.enderecos.map((e) => (
                              <li key={e.id}>
                                {e.logradouro}, {e.numero}
                                {e.complemento && ` — ${e.complemento}`} ·{" "}
                                {e.bairro} · {e.cidade}/{e.uf} · CEP {e.cep}
                                {e.principal && (
                                  <span className="ml-2 text-xs text-panel-accent">
                                    principal
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ClienteModal
        aberto={cadastrando}
        onFechar={() => setCadastrando(false)}
        onSalvo={() => {
          setCadastrando(false);
          carregar();
        }}
      />

      {editando && (
        <ClienteModal
          key={editando.id}
          aberto
          inicial={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}
