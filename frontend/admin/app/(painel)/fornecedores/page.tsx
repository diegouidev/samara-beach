"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import {
  apenasDigitos,
  cnpjValido,
  mascaraCEP,
  mascaraCNPJ,
  mascaraTelefone,
} from "@/lib/masks";
import { Alerta, Badge, Button, Card, EmptyState, Field, PageHeader, inputClass, textareaClass } from "@/components/ui";
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
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function avisar(texto: string) {
    setMsg(texto);
    setTimeout(() => setMsg(null), 2500);
  }

  function carregar() {
    api
      .listarFornecedores()
      .then(setLista)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function alternarAtivo(f: Fornecedor) {
    await api.atualizarFornecedor(f.id, { ativo: !f.ativo });
    avisar(f.ativo ? "Fornecedor desativado." : "Fornecedor ativado.");
    carregar();
  }

  async function excluir(f: Fornecedor) {
    if (!confirm(`Excluir o fornecedor "${f.nome}"?`)) return;
    try {
      await api.excluirFornecedor(f.id);
      avisar("Fornecedor excluído.");
      carregar();
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir (pode haver compras vinculadas).",
      );
    }
  }

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? lista.filter((f) =>
        [f.nome, f.razao_social, f.cnpj, f.cidade]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(termo)),
      )
    : lista;

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${lista.length} cadastrado(s)`}
        action={
          <Button
            onClick={() => {
              setEditando(null);
              setMostrarForm((v) => !v);
            }}
          >
            {mostrarForm && !editando ? "Cancelar" : "+ Novo fornecedor"}
          </Button>
        }
      />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}
      {erro && (
        <Alerta tone="erro">{erro}</Alerta>
      )}

      {(mostrarForm || editando) && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-panel-ink">
            {editando ? `Editar "${editando.nome}"` : "Novo fornecedor"}
          </h2>
          <FornecedorForm
            key={editando?.id ?? "novo"}
            inicial={editando}
            onCancelar={() => {
              setEditando(null);
              setMostrarForm(false);
            }}
            onSalvo={() => {
              setEditando(null);
              setMostrarForm(false);
              avisar(editando ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
              carregar();
            }}
          />
        </Card>
      )}

      <Card className="mb-4">
        <input
          className={inputClass}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, razão social, CNPJ ou cidade…"
        />
      </Card>

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : filtrados.length === 0 ? (
          <EmptyState titulo={lista.length === 0
              ? "Nenhum fornecedor cadastrado."
              : "Nenhum fornecedor encontrado."} />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th>Prazo</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="font-medium text-panel-ink">{f.nome}</div>
                    {f.razao_social && f.razao_social !== f.nome && (
                      <div className="text-xs text-slate-400">
                        {f.razao_social}
                      </div>
                    )}
                  </td>
                  <td className="font-mono text-xs text-slate-600">
                    {f.cnpj || "—"}
                  </td>
                  <td className="text-slate-600">
                    {f.contato_nome || "—"}
                    {f.email && (
                      <div className="text-xs text-slate-400">{f.email}</div>
                    )}
                    {f.telefone && (
                      <div className="text-xs text-slate-400">{f.telefone}</div>
                    )}
                  </td>
                  <td className="text-slate-600">
                    {f.cidade ? `${f.cidade}${f.uf ? `/${f.uf}` : ""}` : "—"}
                  </td>
                  <td className="text-slate-600">
                    {f.prazo_medio_entrega_dias
                      ? `${f.prazo_medio_entrega_dias} dias`
                      : "—"}
                  </td>
                  <td>
                    <Badge tone={f.ativo ? "green" : "red"}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex justify-end gap-3 text-xs">
                      <button
                        onClick={() => {
                          setEditando(f);
                          setMostrarForm(false);
                          setErro(null);
                        }}
                        className="text-panel-accent hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarAtivo(f)}
                        className="text-slate-500 hover:underline"
                      >
                        {f.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluir(f)}
                        className="text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
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

const VAZIO = {
  nome: "",
  cnpj: "",
  razao_social: "",
  nome_fantasia: "",
  contato_nome: "",
  email: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  prazo: "",
  observacoes: "",
  ativo: true,
};

function FornecedorForm({
  inicial,
  onSalvo,
  onCancelar,
}: {
  inicial: Fornecedor | null;
  onSalvo: () => void;
  onCancelar: () => void;
}) {
  const [v, setV] = useState({
    ...VAZIO,
    ...(inicial
      ? {
          nome: inicial.nome,
          cnpj: inicial.cnpj,
          razao_social: inicial.razao_social,
          nome_fantasia: inicial.nome_fantasia,
          contato_nome: inicial.contato_nome,
          email: inicial.email,
          telefone: inicial.telefone,
          cep: inicial.cep,
          logradouro: inicial.logradouro,
          numero: inicial.numero,
          complemento: inicial.complemento,
          bairro: inicial.bairro,
          cidade: inicial.cidade,
          uf: inicial.uf,
          prazo: inicial.prazo_medio_entrega_dias?.toString() ?? "",
          observacoes: inicial.observacoes,
          ativo: inicial.ativo,
        }
      : {}),
  });
  const [consultando, setConsultando] = useState(false);
  const [avisoCNPJ, setAvisoCNPJ] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof typeof v>(campo: K, valor: (typeof v)[K]) {
    setV((prev) => ({ ...prev, [campo]: valor }));
  }

  /**
   * Busca os dados na Receita e preenche o formulário.
   * Dispara sozinho quando o CNPJ fica completo e válido (e também no botão).
   */
  async function preencherPorCNPJ(cnpj: string) {
    if (!cnpjValido(cnpj)) {
      setAvisoCNPJ("CNPJ inválido — confira os números.");
      return;
    }
    setAvisoCNPJ(null);
    setConsultando(true);
    try {
      const d = await api.consultarCNPJ(cnpj);
      setV((prev) => ({
        ...prev,
        cnpj: d.cnpj,
        // Não sobrescreve o que a pessoa já digitou à mão.
        nome: prev.nome || d.nome,
        razao_social: d.razao_social,
        nome_fantasia: d.nome_fantasia,
        email: prev.email || d.email,
        telefone: prev.telefone || mascaraTelefone(d.telefone),
        cep: mascaraCEP(d.cep),
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento,
        bairro: d.bairro,
        cidade: d.cidade,
        uf: d.uf,
      }));
      setAvisoCNPJ(
        `${d.razao_social} — ${d.situacao_cadastral}${
          d.atividade_principal ? ` · ${d.atividade_principal}` : ""
        }`,
      );
    } catch (e) {
      setAvisoCNPJ(
        e instanceof Error
          ? e.message
          : "Não foi possível consultar. Preencha manualmente.",
      );
    } finally {
      setConsultando(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const payload = {
        nome: v.nome,
        cnpj: v.cnpj,
        razao_social: v.razao_social,
        nome_fantasia: v.nome_fantasia,
        contato_nome: v.contato_nome,
        email: v.email,
        telefone: v.telefone,
        cep: v.cep,
        logradouro: v.logradouro,
        numero: v.numero,
        complemento: v.complemento,
        bairro: v.bairro,
        cidade: v.cidade,
        uf: v.uf.toUpperCase(),
        prazo_medio_entrega_dias: v.prazo ? Number(v.prazo) : null,
        observacoes: v.observacoes,
        ativo: v.ativo,
      };
      if (inicial) {
        await api.atualizarFornecedor(inicial.id, payload);
      } else {
        await api.criarFornecedor(payload);
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-4">
        <Field label="CNPJ — digite e os dados vêm da Receita automaticamente">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={v.cnpj}
              onChange={(e) => {
                const mascarado = mascaraCNPJ(e.target.value);
                set("cnpj", mascarado);
                setAvisoCNPJ(null);
                if (apenasDigitos(mascarado).length === 14) {
                  preencherPorCNPJ(mascarado);
                }
              }}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => preencherPorCNPJ(v.cnpj)}
              disabled={consultando || !v.cnpj}
              className="whitespace-nowrap rounded-lg border border-panel-accent px-3 text-sm text-panel-accent disabled:opacity-50"
            >
              {consultando ? "Consultando…" : "Buscar dados"}
            </button>
          </div>
        </Field>
        {avisoCNPJ && (
          <p className="mt-2 text-xs text-slate-500">{avisoCNPJ}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome (como você chama o fornecedor)">
          <input
            className={inputClass}
            value={v.nome}
            onChange={(e) => set("nome", e.target.value)}
            required
          />
        </Field>
        <Field label="Razão social">
          <input
            className={inputClass}
            value={v.razao_social}
            onChange={(e) => set("razao_social", e.target.value)}
          />
        </Field>
        <Field label="Nome fantasia">
          <input
            className={inputClass}
            value={v.nome_fantasia}
            onChange={(e) => set("nome_fantasia", e.target.value)}
          />
        </Field>
        <Field label="Pessoa de contato">
          <input
            className={inputClass}
            value={v.contato_nome}
            onChange={(e) => set("contato_nome", e.target.value)}
          />
        </Field>
        <Field label="E-mail">
          <input
            className={inputClass}
            type="email"
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Telefone">
          <input
            className={inputClass}
            value={v.telefone}
            onChange={(e) => set("telefone", mascaraTelefone(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="CEP">
          <input
            className={inputClass}
            value={v.cep}
            onChange={(e) => set("cep", mascaraCEP(e.target.value))}
            placeholder="00000-000"
            inputMode="numeric"
          />
        </Field>
        <Field label="Logradouro">
          <input
            className={inputClass}
            value={v.logradouro}
            onChange={(e) => set("logradouro", e.target.value)}
          />
        </Field>
        <Field label="Número">
          <input
            className={inputClass}
            value={v.numero}
            onChange={(e) => set("numero", e.target.value)}
          />
        </Field>
        <Field label="Complemento">
          <input
            className={inputClass}
            value={v.complemento}
            onChange={(e) => set("complemento", e.target.value)}
          />
        </Field>
        <Field label="Bairro">
          <input
            className={inputClass}
            value={v.bairro}
            onChange={(e) => set("bairro", e.target.value)}
          />
        </Field>
        <Field label="Cidade">
          <input
            className={inputClass}
            value={v.cidade}
            onChange={(e) => set("cidade", e.target.value)}
          />
        </Field>
        <Field label="UF">
          <input
            className={inputClass}
            value={v.uf}
            maxLength={2}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Prazo médio de entrega (dias)">
          <input
            className={inputClass}
            type="number"
            value={v.prazo}
            onChange={(e) => set("prazo", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          className={textareaClass}
          rows={3}
          value={v.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Condições de pagamento, pedido mínimo…"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.ativo}
          onChange={(e) => set("ativo", e.target.checked)}
        />
        Fornecedor ativo
      </label>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : inicial ? "Salvar alterações" : "Cadastrar"}
        </Button>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
