"use client";

import { useEffect, useRef, useState } from "react";
import {
  atualizarEmpresa,
  consultarCep,
  consultarCnpj,
  getEmpresa,
} from "@/lib/api";
import {
  EMPRESA_VAZIA,
  mascaraCep,
  mascaraCnpj,
  mascaraTelefone,
  type Empresa,
  type EmpresaForm,
} from "@/lib/empresa";
import {
  Alerta,
  Button,
  Card,
  Field,
  PageHeader,
  inputClass,
  textareaClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function EmpresaPage() {
  return (
    <RequireAuth papeis={["admin"]}>
      <EmpresaContent />
    </RequireAuth>
  );
}

const REGIMES = [
  { valor: "", label: "Não informado" },
  { valor: "simples", label: "Simples Nacional" },
  { valor: "presumido", label: "Lucro Presumido" },
  { valor: "real", label: "Lucro Real" },
  { valor: "mei", label: "MEI" },
];

/** Campos exigidos para emitir recibo/NF-e e atender o Decreto 7.962/2013. */
const OBRIGATORIOS: { chave: keyof EmpresaForm; label: string }[] = [
  { chave: "razao_social", label: "Razão social" },
  { chave: "cnpj", label: "CNPJ" },
  { chave: "logradouro", label: "Logradouro" },
  { chave: "cidade", label: "Cidade" },
  { chave: "uf", label: "UF" },
];

function EmpresaContent() {
  const [form, setForm] = useState<EmpresaForm | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  // Marca se há alteração não salva, para avisar antes de sair da página.
  const [sujo, setSujo] = useState(false);
  const cepBuscado = useRef("");

  useEffect(() => {
    getEmpresa()
      .then((e) => setForm(paraForm(e)))
      .catch(() => setErro("Não foi possível carregar os dados da empresa."));
  }, []);

  // Evita perder o preenchimento com um fechamento de aba acidental.
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  if (!form) {
    return erro ? (
      <Alerta tone="erro">{erro}</Alerta>
    ) : (
      <p className="text-panel-inkMuted">Carregando…</p>
    );
  }

  function set<K extends keyof EmpresaForm>(chave: K, valor: EmpresaForm[K]) {
    setForm((prev) => (prev ? { ...prev, [chave]: valor } : prev));
    setSujo(true);
    setMsg(null);
  }

  /** Preenche o cadastro a partir do CNPJ, sem sobrescrever o que já foi digitado. */
  async function buscarPorCnpj() {
    if (!form) return;
    setErro(null);
    setBuscandoCnpj(true);
    try {
      const d = await consultarCnpj(form.cnpj);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              razao_social: prev.razao_social || d.razao_social,
              nome_fantasia: prev.nome_fantasia || d.nome_fantasia,
              cep: prev.cep || mascaraCep(d.cep),
              logradouro: prev.logradouro || d.logradouro,
              numero: prev.numero || d.numero,
              complemento: prev.complemento || d.complemento,
              bairro: prev.bairro || d.bairro,
              cidade: prev.cidade || d.cidade,
              uf: prev.uf || d.uf,
              email: prev.email || d.email,
              telefone: prev.telefone || mascaraTelefone(d.telefone),
            }
          : prev,
      );
      setSujo(true);
      setMsg(
        d.situacao_cadastral
          ? `Dados encontrados na Receita (situação: ${d.situacao_cadastral}). Confira antes de salvar.`
          : "Dados encontrados. Confira antes de salvar.",
      );
    } catch (e) {
      setErro(mensagemDeErro(e, "Não foi possível consultar o CNPJ."));
    } finally {
      setBuscandoCnpj(false);
    }
  }

  /** Busca o endereço assim que o CEP fica completo (8 dígitos). */
  async function buscarPorCep(cep: string) {
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8 || cepBuscado.current === digitos) return;
    cepBuscado.current = digitos;
    setBuscandoCep(true);
    try {
      const d = await consultarCep(digitos);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              logradouro: d.logradouro || prev.logradouro,
              bairro: d.bairro || prev.bairro,
              cidade: d.cidade || prev.cidade,
              uf: d.uf || prev.uf,
            }
          : prev,
      );
      setSujo(true);
    } catch {
      // Silencioso: o CEP pode não existir e o preenchimento manual continua valendo.
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvar() {
    if (!form) return;
    setErro(null);
    setMsg(null);
    setSalvando(true);
    try {
      const salva = await atualizarEmpresa(form);
      setForm(paraForm(salva));
      setSujo(false);
      setMsg("Dados da empresa salvos.");
    } catch (e) {
      setErro(mensagemDeErro(e, "Erro ao salvar."));
    } finally {
      setSalvando(false);
    }
  }

  const faltando = OBRIGATORIOS.filter(({ chave }) => !form[chave]?.trim());

  return (
    <div className="pb-24">
      <PageHeader
        title="Empresa"
        subtitle="Dados cadastrais e fiscais — usados no recibo, na nota e no rodapé da loja"
      />

      {msg && <Alerta tone="sucesso">{msg}</Alerta>}
      {erro && <Alerta tone="erro">{erro}</Alerta>}
      {faltando.length > 0 && (
        <Alerta tone="atencao">
          Cadastro incompleto — faltam{" "}
          <strong>{faltando.map((c) => c.label).join(", ")}</strong>. Estes
          dados aparecem no recibo e no rodapé da loja, exigidos por lei para
          venda online.
        </Alerta>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* --- Identificação --- */}
        <Card title="Identificação">
          <div className="space-y-4">
            <Field
              label="CNPJ"
              hint="Digite e clique em Buscar para preencher o resto automaticamente."
            >
              <div className="flex gap-2">
                <input
                  value={form.cnpj}
                  onChange={(e) => set("cnpj", mascaraCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  className={inputClass}
                />
                <Button
                  variant="outline"
                  onClick={buscarPorCnpj}
                  disabled={
                    buscandoCnpj || form.cnpj.replace(/\D/g, "").length !== 14
                  }
                >
                  {buscandoCnpj ? "Buscando…" : "Buscar"}
                </Button>
              </div>
            </Field>

            <Field label="Razão social">
              <input
                value={form.razao_social}
                onChange={(e) => set("razao_social", e.target.value)}
                placeholder="Nome registrado na Receita Federal"
                className={inputClass}
              />
            </Field>

            <Field label="Nome fantasia" hint="É o nome que aparece no recibo.">
              <input
                value={form.nome_fantasia}
                onChange={(e) => set("nome_fantasia", e.target.value)}
                placeholder="Samara Beach"
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Inscrição estadual" hint='Vazio ou "ISENTO".'>
                <input
                  value={form.inscricao_estadual}
                  onChange={(e) => set("inscricao_estadual", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Inscrição municipal">
                <input
                  value={form.inscricao_municipal}
                  onChange={(e) => set("inscricao_municipal", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Regime tributário">
              <select
                value={form.regime_tributario}
                onChange={(e) =>
                  set(
                    "regime_tributario",
                    e.target.value as EmpresaForm["regime_tributario"],
                  )
                }
                className={inputClass}
              >
                {REGIMES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {/* --- Endereço --- */}
        <Card title="Endereço">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="CEP" hint={buscandoCep ? "Buscando endereço…" : undefined}>
                <input
                  value={form.cep}
                  onChange={(e) => {
                    const valor = mascaraCep(e.target.value);
                    set("cep", valor);
                    buscarPorCep(valor);
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
              <Field label="Logradouro">
                <input
                  value={form.logradouro}
                  onChange={(e) => set("logradouro", e.target.value)}
                  placeholder="Rua, avenida…"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número">
                <input
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Complemento">
                <input
                  value={form.complemento}
                  onChange={(e) => set("complemento", e.target.value)}
                  placeholder="Sala, andar…"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Bairro">
              <input
                value={form.bairro}
                onChange={(e) => set("bairro", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
              <Field label="Cidade">
                <input
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="UF">
                <input
                  value={form.uf}
                  onChange={(e) =>
                    set("uf", e.target.value.toUpperCase().slice(0, 2))
                  }
                  placeholder="CE"
                  maxLength={2}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* --- Contato --- */}
        <Card title="Contato">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone">
                <input
                  value={form.telefone}
                  onChange={(e) => set("telefone", mascaraTelefone(e.target.value))}
                  placeholder="(85) 99999-9999"
                  inputMode="tel"
                  className={inputClass}
                />
              </Field>
              <Field label="WhatsApp comercial" hint="Com DDI, ex.: 5585999998888.">
                <input
                  value={form.whatsapp}
                  onChange={(e) =>
                    set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 13))
                  }
                  placeholder="5585999998888"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="E-mail">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contato@samarabeach.com.br"
                className={inputClass}
              />
            </Field>

            <Field label="Site">
              <input
                type="url"
                value={form.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="https://samarabeach.com.br"
                className={inputClass}
              />
            </Field>

            <Field
              label="Horário de funcionamento"
              hint="Aparece no rodapé da loja."
            >
              <textarea
                value={form.horario_funcionamento}
                onChange={(e) => set("horario_funcionamento", e.target.value)}
                placeholder="Seg a Sex 9h-18h&#10;Sáb 9h-13h"
                rows={3}
                className={textareaClass}
              />
            </Field>
          </div>
        </Card>

        {/* --- Redes sociais --- */}
        <Card title="Redes sociais">
          <p className="mb-4 text-xs text-panel-inkMuted">
            Informe apenas o usuário — o link é montado automaticamente.
          </p>
          <div className="space-y-4">
            {(
              [
                ["instagram", "Instagram", "instagram.com/"],
                ["facebook", "Facebook", "facebook.com/"],
                ["tiktok", "TikTok", "tiktok.com/@"],
              ] as const
            ).map(([chave, label, prefixo]) => (
              <Field key={chave} label={label}>
                <div className="flex items-center rounded-xl border border-panel-borderStrong bg-panel-surface transition focus-within:border-panel-accent focus-within:ring-2 focus-within:ring-panel-accent/25">
                  <span className="pl-3 text-sm text-panel-inkMuted">
                    {prefixo}
                  </span>
                  <input
                    value={form[chave]}
                    onChange={(e) => set(chave, e.target.value)}
                    placeholder="samarabeach"
                    className="h-10 w-full bg-transparent px-1 text-sm text-panel-ink placeholder:text-panel-inkMuted focus:outline-none"
                  />
                </div>
              </Field>
            ))}
          </div>
        </Card>
      </div>

      {/* Barra de ação fixa: o formulário é longo e o botão não pode ficar longe. */}
      {/* Fixa só na área de conteúdo: `left-60` no desktop deixa o rodapé do
          menu (perfil e sair) livre — antes a barra atravessava a tela e
          cobria o clique. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-panel-border bg-panel-surface/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <span className="text-xs text-panel-inkMuted">
            {sujo ? "Alterações não salvas" : "Tudo salvo"}
          </span>
          <Button onClick={salvar} disabled={salvando || !sujo}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Descarta os campos derivados (read-only) que o formulário não envia. */
function paraForm(empresa: Empresa): EmpresaForm {
  const { endereco_linha, esta_completa, updated_at, ...form } = empresa;
  void endereco_linha;
  void esta_completa;
  void updated_at;
  return { ...EMPRESA_VAZIA, ...form };
}

function mensagemDeErro(e: unknown, padrao: string): string {
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
