"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { formatBRL, resolveImagem } from "@/lib/format";
import { Alerta, Badge, Button, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
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
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  useEffect(() => {
    Promise.all([api.listarProdutos(), api.listarCategorias()])
      .then(([p, c]) => {
        setProdutos(p);
        setCategorias(c);
      })
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (termo && !p.nome.toLowerCase().includes(termo)) return false;
      if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
      if (statusFiltro === "ativo" && !p.ativo) return false;
      if (statusFiltro === "inativo" && p.ativo) return false;
      if (statusFiltro === "sem_variacao" && p.total_variacoes > 0) return false;
      return true;
    });
  }, [produtos, busca, categoriaFiltro, statusFiltro]);

  const semVariacao = produtos.filter((p) => p.total_variacoes === 0).length;

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${produtos.length} produto(s) no catálogo`}
        action={
          <Link href="/produtos/novo">
            <Button>+ Novo produto</Button>
          </Link>
        }
      />

      {semVariacao > 0 && (
        <Alerta tone="atencao">{semVariacao} produto(s) sem nenhuma variação — eles não aparecem na
          loja até terem tamanho, preço e foto.</Alerta>
      )}

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={inputClass}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome…"
          />
          <select
            className={inputClass}
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="ativo">Somente ativos</option>
            <option value="inativo">Somente inativos</option>
            <option value="sem_variacao">Sem variação cadastrada</option>
          </select>
        </div>
      </Card>

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : filtrados.length === 0 ? (
          <EmptyState titulo={produtos.length === 0
              ? "Nenhum produto cadastrado."
              : "Nenhum produto encontrado com esses filtros."} />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Tamanhos</th>
                <th>A partir de</th>
                <th>Origem</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const foto = resolveImagem(p.imagem_principal);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-panel-border bg-slate-50">
                          {foto ? (
                            <Image
                              src={foto}
                              alt={p.nome}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[10px] text-slate-300">
                              sem foto
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-panel-ink">
                          {p.nome}
                        </span>
                      </div>
                    </td>
                    <td className="text-slate-600">
                      {p.categoria_nome}
                    </td>
                    <td className="text-slate-600">
                      {p.tamanhos.length > 0 ? (
                        p.tamanhos.join(", ")
                      ) : (
                        <span className="text-amber-600">
                          {p.total_variacoes === 0 ? "nenhuma variação" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="text-slate-600">
                      {p.preco_minimo ? formatBRL(p.preco_minimo) : "—"}
                    </td>
                    <td>
                      <Badge
                        tone={
                          p.tipo_origem === "producao_propria"
                            ? "blue"
                            : "neutral"
                        }
                      >
                        {p.tipo_origem === "producao_propria"
                          ? "Produção própria"
                          : "Revenda"}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={p.ativo ? "green" : "red"}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/produtos/${p.slug}`}
                        className="text-panel-accent hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
