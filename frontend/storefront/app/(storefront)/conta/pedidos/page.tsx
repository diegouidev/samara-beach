"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  listarPedidos,
  listarEnderecos,
  criarEndereco,
  excluirEndereco,
  type NovoEndereco,
} from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { Endereco, Pedido } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  carrinho: "Carrinho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function PedidosPage() {
  const { usuario, carregando } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function recarregarEnderecos() {
    setEnderecos(await listarEnderecos());
  }

  useEffect(() => {
    if (carregando) return;
    if (!usuario) {
      setCarregandoDados(false);
      return;
    }
    Promise.all([listarPedidos(), listarEnderecos()])
      .then(([p, e]) => {
        setPedidos(p);
        setEnderecos(e);
      })
      .catch((err) =>
        setErro(err instanceof Error ? err.message : "Erro ao carregar."),
      )
      .finally(() => setCarregandoDados(false));
  }, [usuario, carregando]);

  if (carregando || carregandoDados) {
    return <p className="mx-auto max-w-4xl px-4 py-16 text-gray-500">Carregando…</p>;
  }

  if (!usuario) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-600">Entre para ver seus pedidos.</p>
        <Link
          href="/conta/login"
          className="mt-4 inline-block rounded-full bg-brand-sea px-6 py-2 text-white"
        >
          Entrar
        </Link>
      </div>
    );
  }

  // Não mostra o carrinho aberto na lista de pedidos.
  const historico = pedidos.filter((p) => p.status !== "carrinho");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-brand-ink">Minha conta</h1>
      <p className="mt-1 text-gray-500">{usuario.email}</p>

      {erro && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      {/* Endereços */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-ink">Endereços salvos</h2>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-full border border-brand-sea px-4 py-1.5 text-sm font-medium text-brand-sea transition hover:bg-brand-sea hover:text-white"
          >
            {mostrarForm ? "Cancelar" : "+ Adicionar endereço"}
          </button>
        </div>

        {mostrarForm && (
          <EnderecoForm
            onSalvo={async () => {
              setMostrarForm(false);
              await recarregarEnderecos();
            }}
          />
        )}

        {enderecos.length === 0 ? (
          !mostrarForm && (
            <p className="text-sm text-gray-500">Nenhum endereço salvo ainda.</p>
          )
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {enderecos.map((e) => (
              <li
                key={e.id}
                className="relative rounded-xl border border-gray-100 p-4 text-sm"
              >
                <p className="font-medium">
                  {e.logradouro}, {e.numero}
                  {e.complemento ? ` — ${e.complemento}` : ""}
                </p>
                <p className="text-gray-500">
                  {e.bairro} — {e.cidade}/{e.uf} · {e.cep}
                </p>
                <button
                  onClick={async () => {
                    if (!confirm("Remover este endereço?")) return;
                    await excluirEndereco(e.id);
                    await recarregarEnderecos();
                  }}
                  className="absolute right-3 top-3 text-xs text-gray-400 hover:text-brand-coral"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pedidos */}
      <section className="mt-10">
        <h2 className="mb-3 font-semibold text-brand-ink">Histórico de pedidos</h2>
        {historico.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
            Você ainda não tem pedidos.
          </p>
        ) : (
          <ul className="space-y-3">
            {historico.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
              >
                <div>
                  <p className="font-mono text-sm text-gray-500">
                    #{p.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")} ·{" "}
                    {p.itens.length} item(ns)
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-brand-sand px-3 py-1 text-xs font-medium text-brand-seaDark">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <p className="mt-1 font-semibold">{formatBRL(p.total)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function EnderecoForm({ onSalvo }: { onSalvo: () => void | Promise<void> }) {
  const [form, setForm] = useState<NovoEndereco>({
    tipo: "entrega",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "SP",
    cep: "",
    principal: false,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof NovoEndereco>(k: K, v: NovoEndereco[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await criarEndereco(form);
      await onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar endereço.");
    } finally {
      setEnviando(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-sea focus:outline-none";

  return (
    <form
      onSubmit={salvar}
      className="mb-4 rounded-xl border border-gray-100 bg-brand-sand/30 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-6">
        <label className="sm:col-span-4">
          <span className="text-xs font-medium text-brand-ink">Logradouro</span>
          <input
            className={input}
            value={form.logradouro}
            onChange={(e) => set("logradouro", e.target.value)}
            placeholder="Rua, avenida..."
            required
          />
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-medium text-brand-ink">Número</span>
          <input
            className={input}
            value={form.numero}
            onChange={(e) => set("numero", e.target.value)}
            required
          />
        </label>
        <label className="sm:col-span-3">
          <span className="text-xs font-medium text-brand-ink">Complemento</span>
          <input
            className={input}
            value={form.complemento}
            onChange={(e) => set("complemento", e.target.value)}
            placeholder="Apto, bloco... (opcional)"
          />
        </label>
        <label className="sm:col-span-3">
          <span className="text-xs font-medium text-brand-ink">Bairro</span>
          <input
            className={input}
            value={form.bairro}
            onChange={(e) => set("bairro", e.target.value)}
            required
          />
        </label>
        <label className="sm:col-span-3">
          <span className="text-xs font-medium text-brand-ink">Cidade</span>
          <input
            className={input}
            value={form.cidade}
            onChange={(e) => set("cidade", e.target.value)}
            required
          />
        </label>
        <label className="sm:col-span-1">
          <span className="text-xs font-medium text-brand-ink">UF</span>
          <select
            className={input}
            value={form.uf}
            onChange={(e) => set("uf", e.target.value)}
          >
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-xs font-medium text-brand-ink">CEP</span>
          <input
            className={input}
            value={form.cep}
            onChange={(e) =>
              set(
                "cep",
                e.target.value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9),
              )
            }
            placeholder="00000-000"
            inputMode="numeric"
            required
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={form.principal}
          onChange={(e) => set("principal", e.target.checked)}
        />
        Usar como endereço principal
      </label>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="mt-3 rounded-full bg-brand-sea px-6 py-2 text-sm font-medium text-white transition hover:bg-brand-seaDark disabled:opacity-50"
      >
        {enviando ? "Salvando…" : "Salvar endereço"}
      </button>
    </form>
  );
}
