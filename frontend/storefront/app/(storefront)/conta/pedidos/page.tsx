"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { listarPedidos, listarEnderecos } from "@/lib/api";
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
        <h2 className="mb-3 font-semibold text-brand-ink">Endereços salvos</h2>
        {enderecos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum endereço salvo ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {enderecos.map((e) => (
              <li key={e.id} className="rounded-xl border border-gray-100 p-4 text-sm">
                <p className="font-medium">
                  {e.logradouro}, {e.numero}
                </p>
                <p className="text-gray-500">
                  {e.bairro} — {e.cidade}/{e.uf} · {e.cep}
                </p>
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
