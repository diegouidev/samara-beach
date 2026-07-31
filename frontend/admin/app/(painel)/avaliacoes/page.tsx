"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { formatData } from "@/lib/format";
import type { Avaliacao } from "@/lib/types";

export default function AvaliacoesPage() {
  return (
    <RequireAuth papeis={["admin", "atendimento"]}>
      <AvaliacoesContent />
    </RequireAuth>
  );
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(nota)}
      <span className="text-slate-300">{"★".repeat(5 - nota)}</span>
    </span>
  );
}

function AvaliacoesContent() {
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [filtro, setFiltro] = useState<"pendentes" | "todas">("pendentes");
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    setCarregando(true);
    const params: Record<string, string> =
      filtro === "pendentes" ? { aprovada: "false" } : {};
    api
      .listarAvaliacoes(params)
      .then(setLista)
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [filtro]);

  async function aprovar(id: string, aprovada: boolean) {
    await api.moderarAvaliacao(id, aprovada);
    carregar();
  }
  async function excluir(id: string) {
    if (!confirm("Excluir esta avaliação?")) return;
    await api.excluirAvaliacao(id);
    carregar();
  }

  return (
    <div>
      <PageHeader
        title="Moderação de avaliações"
        subtitle="Aprove ou rejeite avaliações enviadas por clientes"
        action={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            <button
              onClick={() => setFiltro("pendentes")}
              className={`rounded-md px-3 py-1 ${filtro === "pendentes" ? "bg-white font-medium shadow" : "text-slate-500"}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFiltro("todas")}
              className={`rounded-md px-3 py-1 ${filtro === "todas" ? "bg-white font-medium shadow" : "text-slate-500"}`}
            >
              Todas
            </button>
          </div>
        }
      />

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : lista.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">
            {filtro === "pendentes"
              ? "Nenhuma avaliação pendente. 🎉"
              : "Nenhuma avaliação."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lista.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Estrelas nota={a.nota} />
                      <Badge tone={a.aprovada ? "green" : "amber"}>
                        {a.aprovada ? "Aprovada" : "Pendente"}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatData(a.created_at)}
                      </span>
                    </div>
                    {a.comentario && (
                      <p className="mt-2 text-sm text-slate-600">
                        {a.comentario}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    {!a.aprovada ? (
                      <Button onClick={() => aprovar(a.id, true)}>Aprovar</Button>
                    ) : (
                      <Button variant="outline" onClick={() => aprovar(a.id, false)}>
                        Ocultar
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => excluir(a.id)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
