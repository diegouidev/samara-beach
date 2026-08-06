"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { PapelInterno, UsuarioInterno } from "@/lib/types";
import {
  Alerta,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  inputClass,
  textareaClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function UsuariosPage() {
  return (
    <RequireAuth papeis={["admin"]}>
      <UsuariosContent />
    </RequireAuth>
  );
}

/** O papel decide o que a pessoa enxerga — a descrição evita escolha às cegas. */
const PAPEIS: { valor: PapelInterno; label: string; descricao: string }[] = [
  {
    valor: "admin",
    label: "Administrador",
    descricao: "Acesso total, incluindo esta tela e a Empresa.",
  },
  {
    valor: "estoque",
    label: "Estoque",
    descricao: "Produtos, categorias, estoque e compras.",
  },
  {
    valor: "financeiro",
    label: "Financeiro",
    descricao: "Relatórios, margem, contas a pagar e caixa.",
  },
  {
    valor: "atendimento",
    label: "Atendimento",
    descricao: "Pedidos, clientes, cupons e PDV.",
  },
];

const PAPEL_LABEL: Record<PapelInterno, string> = {
  admin: "Administrador",
  estoque: "Estoque",
  financeiro: "Financeiro",
  atendimento: "Atendimento",
};

const PAPEL_TOM: Record<PapelInterno, "blue" | "neutral" | "green" | "amber"> = {
  admin: "blue",
  estoque: "neutral",
  financeiro: "green",
  atendimento: "amber",
};

interface FormUsuario {
  email: string;
  first_name: string;
  last_name: string;
  senha: string;
  papel: PapelInterno;
  cpf: string;
  telefone: string;
  cargo: string;
  data_admissao: string;
  observacoes: string;
}

const FORM_VAZIO: FormUsuario = {
  email: "",
  first_name: "",
  last_name: "",
  senha: "",
  papel: "atendimento",
  cpf: "",
  telefone: "",
  cargo: "",
  data_admissao: "",
  observacoes: "",
};

function UsuariosContent() {
  const { usuario: eu } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioInterno[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroPapel, setFiltroPapel] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Modal de cadastro/edição.
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioInterno | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Modal de redefinição de senha.
  const [senhaDe, setSenhaDe] = useState<UsuarioInterno | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const params: Record<string, string> = {};
      if (busca) params.search = busca;
      if (filtroPapel) params.papel = filtroPapel;
      if (!mostrarInativos) params.ativo = "true";
      const dados = await api.listarUsuariosInternos(params);
      setUsuarios(dados.results);
    } catch (e) {
      setErro(mensagem(e, "Não foi possível carregar os usuários."));
      setUsuarios([]);
    }
  }, [busca, filtroPapel, mostrarInativos]);

  // Debounce na busca — evita uma requisição por tecla digitada.
  useEffect(() => {
    const t = setTimeout(carregar, busca ? 350 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErroForm(null);
    setAberto(true);
  }

  function abrirEdicao(u: UsuarioInterno) {
    setEditando(u);
    setForm({
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      senha: "",
      papel: u.papel,
      cpf: u.cpf,
      telefone: u.telefone,
      cargo: u.cargo,
      data_admissao: u.data_admissao ?? "",
      observacoes: u.observacoes,
    });
    setErroForm(null);
    setAberto(true);
  }

  async function salvar() {
    setErroForm(null);
    setSalvando(true);
    try {
      const comum = {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        papel: form.papel,
        cpf: form.cpf,
        telefone: form.telefone,
        cargo: form.cargo,
        data_admissao: form.data_admissao || null,
        observacoes: form.observacoes,
      };
      if (editando) {
        await api.atualizarUsuarioInterno(editando.id, comum);
        setMsg(`Dados de ${form.first_name || form.email} atualizados.`);
      } else {
        await api.criarUsuarioInterno({ ...comum, senha: form.senha });
        setMsg(
          `${form.first_name || form.email} cadastrado. Passe a senha para a pessoa — ela pode trocá-la em "Meu perfil".`,
        );
      }
      setAberto(false);
      carregar();
    } catch (e) {
      setErroForm(mensagem(e, "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u: UsuarioInterno) {
    setErro(null);
    try {
      if (u.is_active) {
        await api.desativarUsuario(u.id);
        setMsg(`${u.nome_exibicao} não tem mais acesso ao sistema.`);
      } else {
        await api.reativarUsuario(u.id);
        setMsg(`${u.nome_exibicao} voltou a ter acesso.`);
      }
      carregar();
    } catch (e) {
      setErro(mensagem(e, "Não foi possível alterar o acesso."));
    }
  }

  async function redefinirSenha() {
    if (!senhaDe) return;
    setErroForm(null);
    setSalvando(true);
    try {
      await api.definirSenhaUsuario(senhaDe.id, novaSenha);
      setMsg(`Senha de ${senhaDe.nome_exibicao} redefinida.`);
      setSenhaDe(null);
      setNovaSenha("");
    } catch (e) {
      setErroForm(mensagem(e, "Não foi possível redefinir a senha."));
    } finally {
      setSalvando(false);
    }
  }

  const podeSalvar =
    form.email.trim() !== "" &&
    (editando !== null || form.senha.length >= 8);

  return (
    <div>
      <PageHeader
        title="Usuários do sistema"
        subtitle="Quem acessa o painel e o que cada pessoa pode ver"
        action={<Button onClick={abrirNovo}>Novo usuário</Button>}
      />

      {msg && <Alerta tone="sucesso">{msg}</Alerta>}
      {erro && <Alerta tone="erro">{erro}</Alerta>}

      <Card>
        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou cargo…"
            className={`${inputClass} max-w-xs`}
          />
          <select
            value={filtroPapel}
            onChange={(e) => setFiltroPapel(e.target.value)}
            className={`${inputClass} max-w-[190px]`}
          >
            <option value="">Todos os papéis</option>
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-panel-inkSoft">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
              className="h-4 w-4 rounded border-panel-borderStrong"
            />
            Mostrar sem acesso
          </label>
        </div>

        {usuarios === null ? (
          <p className="py-10 text-center text-panel-inkMuted">Carregando…</p>
        ) : usuarios.length === 0 ? (
          <EmptyState
            titulo="Nenhum usuário encontrado"
            descricao={
              busca || filtroPapel
                ? "Tente outro termo ou limpe os filtros."
                : "Cadastre quem vai acessar o painel."
            }
            acao={<Button onClick={abrirNovo}>Novo usuário</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel-border text-left text-xs uppercase tracking-wide text-panel-inkMuted">
                  <th className="pb-2 pr-3 font-medium">Pessoa</th>
                  <th className="pb-2 pr-3 font-medium">Papel</th>
                  <th className="pb-2 pr-3 font-medium">Cargo</th>
                  <th className="pb-2 pr-3 font-medium">Último acesso</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const souEu = u.id === eu?.id;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-panel-border/60 last:border-0 ${
                        u.is_active ? "" : "opacity-60"
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <p className="font-medium text-panel-ink">
                          {u.nome_exibicao}
                          {souEu && (
                            <span className="ml-2 text-xs text-panel-inkMuted">
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-panel-inkMuted">{u.email}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={PAPEL_TOM[u.papel]}>
                          {PAPEL_LABEL[u.papel]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-panel-inkSoft">
                        {u.cargo || "—"}
                      </td>
                      <td className="py-3 pr-3 text-xs text-panel-inkMuted">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString("pt-BR")
                          : "Nunca acessou"}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1.5">
                          {!u.is_active && (
                            <Badge tone="neutral">Sem acesso</Badge>
                          )}
                          <Button variant="ghost" onClick={() => abrirEdicao(u)}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSenhaDe(u);
                              setNovaSenha("");
                              setErroForm(null);
                            }}
                          >
                            Senha
                          </Button>
                          {/* A própria conta não pode ser desativada — deixaria
                              a loja sem administrador. */}
                          {!souEu && (
                            <Button
                              variant={u.is_active ? "danger" : "outline"}
                              onClick={() => alternarAtivo(u)}
                            >
                              {u.is_active ? "Remover acesso" : "Reativar"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --- Modal de cadastro / edição --- */}
      <Modal
        aberto={aberto}
        titulo={editando ? "Editar usuário" : "Novo usuário"}
        subtitulo={
          editando
            ? "Alterações valem no próximo acesso da pessoa."
            : "A pessoa entra com o e-mail e a senha definidos aqui."
        }
        onFechar={() => setAberto(false)}
      >
        {erroForm && <Alerta tone="erro">{erroForm}</Alerta>}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <input
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Sobrenome">
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="E-mail de acesso">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="pessoa@samarabeach.com"
              className={inputClass}
            />
          </Field>

          {!editando && (
            <Field
              label="Senha inicial"
              hint="Mínimo de 8 caracteres. A pessoa pode trocar depois em Meu perfil."
            >
              <input
                type="text"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="Anote para repassar"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Papel (define o que a pessoa acessa)">
            <div className="space-y-2">
              {PAPEIS.map((p) => (
                <label
                  key={p.valor}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                    form.papel === p.valor
                      ? "border-panel-accent bg-panel-accent/5"
                      : "border-panel-border hover:border-panel-borderStrong"
                  }`}
                >
                  <input
                    type="radio"
                    name="papel"
                    checked={form.papel === p.valor}
                    onChange={() => setForm({ ...form, papel: p.valor })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium text-panel-ink">
                      {p.label}
                    </span>
                    <span className="block text-xs text-panel-inkMuted">
                      {p.descricao}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cargo" hint="Só informativo.">
              <input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                placeholder="Vendedora"
                className={inputClass}
              />
            </Field>
            <Field label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CPF">
              <input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Data de admissão">
              <input
                type="date"
                value={form.data_admissao}
                onChange={(e) =>
                  setForm({ ...form, data_admissao: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
              rows={2}
              className={textareaClass}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !podeSalvar}>
            {salvando ? "Salvando…" : editando ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      </Modal>

      {/* --- Modal de redefinição de senha --- */}
      <Modal
        aberto={senhaDe !== null}
        titulo="Redefinir senha"
        subtitulo={
          senhaDe
            ? `Nova senha de acesso para ${senhaDe.nome_exibicao}.`
            : undefined
        }
        largura="max-w-md"
        onFechar={() => setSenhaDe(null)}
      >
        {erroForm && <Alerta tone="erro">{erroForm}</Alerta>}
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
          <input
            type="text"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Anote para repassar"
            className={inputClass}
          />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSenhaDe(null)}>
            Cancelar
          </Button>
          <Button
            onClick={redefinirSenha}
            disabled={salvando || novaSenha.length < 8}
          >
            {salvando ? "Salvando…" : "Redefinir"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function mensagem(e: unknown, padrao: string): string {
  if (e instanceof Error && e.message) {
    // A API devolve {"campo": ["msg"]} — mostra a mensagem, não o JSON cru.
    try {
      const dados = JSON.parse(e.message);
      const primeiro = Object.values(dados)[0];
      if (Array.isArray(primeiro) && typeof primeiro[0] === "string") {
        return primeiro[0];
      }
    } catch {
      return e.message;
    }
    return e.message;
  }
  return padrao;
}
