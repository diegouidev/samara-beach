"use client";

import Link from "next/link";
import { useState } from "react";
import { slugify } from "@/lib/masks";
import { Button, Field, inputClass, textareaClass } from "@/components/ui";
import type { Categoria, Produto } from "@/lib/types";

export interface ProdutoFormValues {
  nome: string;
  slug: string;
  descricao: string;
  categoria: string;
  tipo_origem: "producao_propria" | "revenda";
  tags: string[];
  ativo: boolean;
}

export function ProdutoForm({
  categorias,
  inicial,
  onSubmit,
  submitLabel = "Salvar",
}: {
  categorias: Categoria[];
  inicial?: Produto;
  onSubmit: (values: ProdutoFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<ProdutoFormValues>({
    nome: inicial?.nome ?? "",
    slug: inicial?.slug ?? "",
    descricao: inicial?.descricao ?? "",
    categoria: inicial?.categoria ?? "",
    tipo_origem: inicial?.tipo_origem ?? "producao_propria",
    tags: inicial?.tags ?? [],
    ativo: inicial?.ativo ?? true,
  });
  const [tagNova, setTagNova] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof ProdutoFormValues>(
    k: K,
    v: ProdutoFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function adicionarTag() {
    const tag = tagNova.trim();
    if (tag && !values.tags.includes(tag)) set("tags", [...values.tags, tag]);
    setTagNova("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!values.categoria) {
      setErro("Escolha uma categoria.");
      return;
    }

    setEnviando(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  // Sem categoria cadastrada não dá para criar produto (a API exige o vínculo).
  if (categorias.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Nenhuma categoria cadastrada ainda. Crie uma em{" "}
        <Link href="/categorias" className="font-medium underline">
          Categorias
        </Link>{" "}
        antes de cadastrar produtos.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nome">
        <input
          className={inputClass}
          value={values.nome}
          onChange={(e) => {
            const nome = e.target.value;
            set("nome", nome);
            // Na edição a URL é preservada para não quebrar links já publicados.
            if (!inicial) set("slug", slugify(nome));
          }}
          placeholder="Biquíni Lua Cheia"
          required
        />
      </Field>

      <Field label="Slug (URL na loja)">
        <input
          className={inputClass}
          value={values.slug}
          onChange={(e) => set("slug", slugify(e.target.value))}
          required
        />
      </Field>

      <Field label="Descrição">
        <textarea
          className={textareaClass}
          rows={4}
          value={values.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Tecido, caimento, cuidados de lavagem…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria">
          <select
            className={inputClass}
            value={values.categoria}
            onChange={(e) => set("categoria", e.target.value)}
            required
          >
            <option value="">— selecione</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Origem">
          <select
            className={inputClass}
            value={values.tipo_origem}
            onChange={(e) =>
              set(
                "tipo_origem",
                e.target.value as ProdutoFormValues["tipo_origem"],
              )
            }
          >
            <option value="producao_propria">Produção própria</option>
            <option value="revenda">Revenda</option>
          </select>
        </Field>
      </div>

      <Field label="Tags (busca e vitrines)">
        <div className="flex flex-wrap gap-2">
          {values.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
            >
              {tag}
              <button
                type="button"
                onClick={() =>
                  set(
                    "tags",
                    values.tags.filter((t) => t !== tag),
                  )
                }
                className="text-slate-400 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass}
            value={tagNova}
            onChange={(e) => setTagNova(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarTag();
              }
            }}
            placeholder="verão, lançamento…"
          />
          <Button variant="outline" onClick={adicionarTag}>
            Incluir
          </Button>
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.ativo}
          onChange={(e) => set("ativo", e.target.checked)}
        />
        Produto ativo (visível na loja)
      </label>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <Button type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : submitLabel}
      </Button>
    </form>
  );
}
