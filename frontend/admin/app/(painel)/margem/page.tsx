"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { formatBRL } from "@/lib/format";
import type { MargemLinha } from "@/lib/types";

export default function MargemPage() {
  return (
    <RequireAuth papeis={["admin", "financeiro"]}>
      <MargemContent />
    </RequireAuth>
  );
}

function MargemContent() {
  const [linhas, setLinhas] = useState<MargemLinha[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .margem()
      .then((r) => setLinhas(r.results))
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Relatório de margem"
        subtitle="Margem por produto (produção própria vs. revenda)"
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <Card className="p-0">
        {carregando ? (
          <p className="p-6 text-sm text-slate-400">Carregando…</p>
        ) : linhas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            Ainda não há vendas confirmadas para calcular margem.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-panel-border text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3 text-right">Un.</th>
                <th className="px-5 py-3 text-right">Receita</th>
                <th className="px-5 py-3 text-right">Custo</th>
                <th className="px-5 py-3 text-right">Margem</th>
                <th className="px-5 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.produto_id} className="border-b border-panel-border last:border-0">
                  <td className="px-5 py-3 font-medium text-panel-ink">
                    {l.produto}
                    {l.custo_incompleto && (
                      <span className="ml-2 text-xs text-amber-600">
                        (custo não informado)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={l.tipo_origem === "producao_propria" ? "blue" : "neutral"}>
                      {l.tipo_origem === "producao_propria" ? "Própria" : "Revenda"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">{l.unidades}</td>
                  <td className="px-5 py-3 text-right">{formatBRL(l.receita)}</td>
                  <td className="px-5 py-3 text-right">{formatBRL(l.custo)}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatBRL(l.margem)}
                  </td>
                  <td className="px-5 py-3 text-right">{l.margem_percentual}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
