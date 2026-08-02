"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { inputClass } from "@/components/ui";
import { ClienteModal } from "@/components/clientes/ClienteModal";
import type { ClienteAdmin } from "@/lib/types";

/**
 * Cliente da venda: opcional (consumidor final), com busca na base e
 * cadastro rápido — sem login, só nome e contato.
 */
export function SeletorCliente({
  cliente,
  onChange,
}: {
  cliente: ClienteAdmin | null;
  onChange: (c: ClienteAdmin | null) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ClienteAdmin[]>([]);
  const [cadastrando, setCadastrando] = useState(false);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .listarClientes({ search: termo })
        .then(setResultados)
        .catch(() => setResultados([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [termo]);

  if (cliente) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <div className="text-sm">
          <p className="font-medium text-panel-ink">{cliente.nome}</p>
          <p className="text-xs text-slate-400">
            {[cliente.telefone, cliente.cpf].filter(Boolean).join(" · ") ||
              "sem contato"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-slate-500 hover:text-red-500"
        >
          trocar
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        className={inputClass}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Consumidor final — busque por nome, CPF ou telefone"
        autoComplete="off"
      />

      {resultados.length > 0 && (
        <ul className="mt-2 max-h-44 divide-y divide-panel-border overflow-y-auto rounded-lg border border-panel-border">
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(c);
                  setTermo("");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-panel-ink">{c.nome}</span>
                <span className="block text-xs text-slate-400">
                  {[c.telefone, c.cpf, c.email].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCadastrando(true)}
        className="mt-2 text-xs text-panel-accent hover:underline"
      >
        + Cadastrar cliente novo
      </button>

      {/* O cadastro completo abre em modal para não empurrar a venda na tela. */}
      <ClienteModal
        aberto={cadastrando}
        onFechar={() => setCadastrando(false)}
        onSalvo={(c) => {
          onChange(c);
          setCadastrando(false);
          setTermo("");
        }}
      />
    </div>
  );
}
