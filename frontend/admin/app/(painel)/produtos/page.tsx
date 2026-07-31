"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { Categoria, ProdutoResumo } from "@/lib/types";

export default function ProdutosPage() {
  return (
    <RequireAuth papeis={["admin", "estoque"]}>
      <ProdutosContent />
    </RequireAuth>
  );
}

function ProdutosContent() {
  const [produtos, setProdutos] = useState<ProdutoResumo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([api.listarProdutos(), api.listarCategorias()])
      .then(([p, c]) => {
        setProdutos(p);
        setCategorias(c);
      })
      .finally(() => setCarregando(false));
  }, []);

  const nomeCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${produtos.length} produto(s)`}
        action={
          <Link href="/produtos/novo">
            <Button>+ Novo produto</Button>
          </Link>
        }
      />

      <Card className="p-0">
        {carregando ? (
          <p className="p-6 text-sm text-slate-400">Carregando…</p>
        ) : produtos.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            Nenhum produto cadastrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-panel-border text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-panel-border last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-panel-ink">
                    {p.nome}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {nomeCategoria(p.categoria)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={p.tipo_origem === "producao_propria" ? "blue" : "neutral"}>
                      {p.tipo_origem === "producao_propria"
                        ? "Produção própria"
                        : "Revenda"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={p.ativo ? "green" : "red"}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/produtos/${p.slug}`}
                      className="text-panel-accent hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
