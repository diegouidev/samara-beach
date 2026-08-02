"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { PAPEL_LABEL } from "@/lib/format";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function PerfilPage() {
  return (
    <RequireAuth>
      <PerfilContent />
    </RequireAuth>
  );
}

function PerfilContent() {
  const { usuario, recarregar, sair } = useAuth();

  if (!usuario) return null;

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        subtitle="Seus dados de acesso ao painel"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-panel-accent text-lg font-bold text-white">
              {(usuario.first_name || usuario.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-panel-ink">
                {[usuario.first_name, usuario.last_name]
                  .filter(Boolean)
                  .join(" ") || usuario.email}
              </p>
              <Badge tone="blue">
                {usuario.papel ? PAPEL_LABEL[usuario.papel] : "Interno"}
              </Badge>
            </div>
          </div>

          <DadosForm
            inicial={usuario}
            onSalvo={() => {
              recarregar();
            }}
          />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">Alterar senha</h2>
          <SenhaForm />

          <div className="mt-6 border-t border-panel-border pt-4">
            <p className="text-sm text-slate-500">
              Encerrar a sessão neste navegador.
            </p>
            <Button variant="outline" className="mt-2" onClick={() => sair()}>
              Sair da conta
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DadosForm({
  inicial,
  onSalvo,
}: {
  inicial: { first_name: string; last_name: string; email: string };
  onSalvo: () => void;
}) {
  const [firstName, setFirstName] = useState(inicial.first_name);
  const [lastName, setLastName] = useState(inicial.last_name);
  const [email, setEmail] = useState(inicial.email);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMsg(null);
    setEnviando(true);
    try {
      await api.atualizarPerfil({
        first_name: firstName,
        last_name: lastName,
        email,
      });
      setMsg("Dados atualizados.");
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <input
            className={inputClass}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label="Sobrenome">
          <input
            className={inputClass}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>

      <Field label="E-mail (usado para entrar)">
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      {msg && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      )}
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar dados"}
      </Button>
    </form>
  );
}

function SenhaForm() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMsg(null);

    if (nova !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setEnviando(true);
    try {
      await api.alterarSenha(atual, nova);
      setMsg("Senha alterada com sucesso.");
      setAtual("");
      setNova("");
      setConfirmacao("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao alterar a senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Field label="Senha atual">
        <input
          className={inputClass}
          type="password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          required
        />
      </Field>
      <Field label="Nova senha">
        <input
          className={inputClass}
          type="password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          required
        />
      </Field>
      <Field label="Confirmar nova senha">
        <input
          className={inputClass}
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
        />
      </Field>

      {msg && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      )}
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <Button type="submit" disabled={enviando}>
        {enviando ? "Alterando…" : "Alterar senha"}
      </Button>
    </form>
  );
}
