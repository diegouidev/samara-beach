"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import type { Categoria } from "@/lib/types";

export default function NovoProdutoPage() {
  return (
    <RequireAuth papeis={["admin", "estoque"]}>
      <NovoConteudo />
    </RequireAuth>
  );
}

function NovoConteudo() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    api.listarCategorias().then(setCategorias);
  }, []);

  return (
    <div>
      <PageHeader title="Novo produto" subtitle="Cadastre um produto no catálogo" />
      <Card>
        <ProdutoForm
          categorias={categorias}
          submitLabel="Criar produto"
          onSubmit={async (values) => {
            const criado = await api.criarProduto(values);
            router.push(`/produtos/${criado.slug}`);
          }}
        />
      </Card>
    </div>
  );
}
