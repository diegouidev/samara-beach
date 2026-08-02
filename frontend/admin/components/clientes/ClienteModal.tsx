"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { apenasDigitos, mascaraCEP, mascaraCPF, mascaraTelefone } from "@/lib/masks";
import { Alerta, Button, Field, Modal, inputClass, textareaClass } from "@/components/ui";
import type { ClienteAdmin } from "@/lib/types";

const VAZIO = {
  nome: "",
  telefone: "",
  cpf: "",
  email: "",
  data_nascimento: "",
  observacoes: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/**
 * Cadastro completo de cliente em modal — usado tanto no PDV (durante a venda)
 * quanto na página de Clientes, para não haver dois formulários divergentes.
 */
export function ClienteModal({
  aberto,
  inicial,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  /** Preenchido = edição; nulo = cadastro novo. */
  inicial?: ClienteAdmin | null;
  onFechar: () => void;
  onSalvo: (cliente: ClienteAdmin) => void;
}) {
  const principal =
    inicial?.enderecos?.find((e) => e.principal) ?? inicial?.enderecos?.[0];

  const [v, setV] = useState({
    ...VAZIO,
    ...(inicial
      ? {
          nome: inicial.nome,
          telefone: inicial.telefone,
          cpf: inicial.cpf,
          email: inicial.email ?? "",
          data_nascimento: inicial.data_nascimento ?? "",
          observacoes: inicial.observacoes ?? "",
          cep: principal?.cep ?? "",
          logradouro: principal?.logradouro ?? "",
          numero: principal?.numero ?? "",
          complemento: principal?.complemento ?? "",
          bairro: principal?.bairro ?? "",
          cidade: principal?.cidade ?? "",
          uf: principal?.uf ?? "",
        }
      : {}),
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof typeof v>(campo: K, valor: (typeof v)[K]) {
    setV((prev) => ({ ...prev, [campo]: valor }));
  }

  /** Busca o endereço assim que o CEP fica completo. */
  async function preencherPorCep(cep: string) {
    setAvisoCep(null);
    setBuscandoCep(true);
    try {
      const d = await api.consultarCEP(cep);
      setV((prev) => ({
        ...prev,
        cep: d.cep,
        logradouro: d.logradouro || prev.logradouro,
        bairro: d.bairro || prev.bairro,
        cidade: d.cidade || prev.cidade,
        uf: d.uf || prev.uf,
      }));
    } catch (e) {
      setAvisoCep(
        e instanceof Error ? e.message : "CEP não encontrado — preencha à mão.",
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const payload = {
        nome: v.nome.trim(),
        telefone: v.telefone,
        cpf: v.cpf,
        email: v.email.trim(),
        // Data vazia precisa ir como null: string vazia não é data válida.
        data_nascimento: v.data_nascimento || null,
        observacoes: v.observacoes,
        endereco: {
          cep: v.cep,
          logradouro: v.logradouro,
          numero: v.numero,
          complemento: v.complemento,
          bairro: v.bairro,
          cidade: v.cidade,
          uf: v.uf,
        },
      };
      const salvo = inicial
        ? await api.atualizarCliente(inicial.id, payload)
        : await api.criarCliente(payload);
      onSalvo(salvo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o cliente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={inicial ? `Editar ${inicial.nome}` : "Novo cliente"}
      subtitulo="Só o nome é obrigatório — o resto ajuda no atendimento e nas campanhas."
      onFechar={onFechar}
    >
      <form onSubmit={salvar} className="space-y-5">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-panel-inkMuted">
            Dados pessoais
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo">
              <input
                className={inputClass}
                value={v.nome}
                onChange={(e) => set("nome", e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input
                className={inputClass}
                value={v.telefone}
                onChange={(e) => set("telefone", mascaraTelefone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
              />
            </Field>
            <Field label="CPF">
              <input
                className={inputClass}
                value={v.cpf}
                onChange={(e) => set("cpf", mascaraCPF(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </Field>
            <Field label="E-mail">
              <input
                className={inputClass}
                type="email"
                value={v.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="cliente@email.com"
              />
            </Field>
            <Field label="Data de nascimento" hint="Para campanhas de aniversário.">
              <input
                className={inputClass}
                type="date"
                value={v.data_nascimento}
                onChange={(e) => set("data_nascimento", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-panel-inkMuted">
            Endereço
          </h3>
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Field label="CEP">
                <input
                  className={inputClass}
                  value={v.cep}
                  onChange={(e) => {
                    const mascarado = mascaraCEP(e.target.value);
                    set("cep", mascarado);
                    if (apenasDigitos(mascarado).length === 8) {
                      preencherPorCep(mascarado);
                    }
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Logradouro">
                <input
                  className={inputClass}
                  value={v.logradouro}
                  onChange={(e) => set("logradouro", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Número">
              <input
                className={inputClass}
                value={v.numero}
                onChange={(e) => set("numero", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Complemento">
                <input
                  className={inputClass}
                  value={v.complemento}
                  onChange={(e) => set("complemento", e.target.value)}
                  placeholder="apto, bloco…"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Bairro">
                <input
                  className={inputClass}
                  value={v.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                />
              </Field>
            </div>
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
          </div>
          {buscandoCep && (
            <p className="mt-2 text-xs text-panel-inkMuted">Buscando o CEP…</p>
          )}
          {avisoCep && <p className="mt-2 text-xs text-amber-600">{avisoCep}</p>}
        </section>

        <Field label="Observações">
          <textarea
            className={textareaClass}
            rows={2}
            value={v.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Preferências, tamanho que costuma levar, histórico…"
          />
        </Field>

        {erro && <Alerta tone="erro">{erro}</Alerta>}

        <div className="flex justify-end gap-2 border-t border-panel-border pt-4">
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando || !v.nome.trim()}>
            {enviando ? "Salvando…" : inicial ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
