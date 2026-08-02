"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { Alerta, Button, Card, PageHeader } from "@/components/ui";
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
          <div className="flex gap-2">
            <a
              href={`/produtos/${produto.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-panel-accent px-4 py-2 text-sm font-medium text-panel-accent transition hover:bg-cyan-50"
            >
              Ver na loja ↗
            </a>
            <Button variant="danger" onClick={excluir}>
              Excluir
            </Button>
          </div>
        }
      />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
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

        <Card className="lg:col-span-2">
          <VariacaoManager key={produto.id} produto={produto} />
        </Card>
      </div>
    </div>
  );
}
