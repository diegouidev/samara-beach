"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { VariacaoManager } from "@/components/produtos/VariacaoManager";
import type { Categoria, Produto } from "@/lib/types";

export default function EditarProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <RequireAuth papeis={["admin", "estoque"]}>
      <EditarConteudo slug={slug} />
    </RequireAuth>
  );
}

function EditarConteudo({ slug }: { slug: string }) {
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.buscarProduto(slug), api.listarCategorias()])
      .then(([p, c]) => {
        setProduto(p);
        setCategorias(c);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"));
  }, [slug]);

  if (erro) {
    return <p className="rounded-lg bg-red-50 px-4 py-2 text-red-600">{erro}</p>;
  }
  if (!produto) {
    return <p className="text-slate-400">Carregando…</p>;
  }

  async function excluir() {
    if (!produto) return;
    if (!confirm(`Excluir "${produto.nome}"?`)) return;
    await api.excluirProduto(produto.slug);
    router.push("/produtos");
  }

  return (
    <div>
      <PageHeader
        title={produto.nome}
        subtitle="Editar produto e variações"
        action={
          <Button variant="danger" onClick={excluir}>
            Excluir
          </Button>
        }
      />

      {msg && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">Dados do produto</h2>
          <ProdutoForm
            categorias={categorias}
            inicial={produto}
            submitLabel="Salvar alterações"
            onSubmit={async (values) => {
              const atualizado = await api.atualizarProduto(produto.slug, values);
              setProduto((prev) => (prev ? { ...prev, ...atualizado } : atualizado));
              setMsg("Produto atualizado.");
              setTimeout(() => setMsg(null), 2500);
              if (atualizado.slug !== produto.slug) {
                router.replace(`/produtos/${atualizado.slug}`);
              }
            }}
          />
        </Card>

        <Card>
          <VariacaoManager produto={produto} />
        </Card>
      </div>
    </div>
  );
}
