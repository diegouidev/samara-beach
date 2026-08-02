"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Alerta, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
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
        <Alerta tone="erro">{erro}</Alerta>
      )}

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : linhas.length === 0 ? (
          <EmptyState titulo={"Ainda não há vendas confirmadas para calcular margem."} />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Origem</th>
                <th className="text-right">Un.</th>
                <th className="text-right">Receita</th>
                <th className="text-right">Custo</th>
                <th className="text-right">Margem</th>
                <th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.produto_id}>
                  <td className="font-medium text-panel-ink">
                    {l.produto}
                    {l.custo_incompleto && (
                      <span className="ml-2 text-xs text-amber-600">
                        (custo não informado)
                      </span>
                    )}
                  </td>
                  <td>
                    <Badge tone={l.tipo_origem === "producao_propria" ? "blue" : "neutral"}>
                      {l.tipo_origem === "producao_propria" ? "Própria" : "Revenda"}
                    </Badge>
                  </td>
                  <td className="text-right">{l.unidades}</td>
                  <td className="text-right">{formatBRL(l.receita)}</td>
                  <td className="text-right">{formatBRL(l.custo)}</td>
                  <td className="text-right font-medium">
                    {formatBRL(l.margem)}
                  </td>
                  <td className="text-right">{l.margem_percentual}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
