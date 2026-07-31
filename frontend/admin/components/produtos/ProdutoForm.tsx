"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import type { Categoria, Produto } from "@/lib/types";

export interface ProdutoFormValues {
  nome: string;
  slug: string;
  descricao: string;
  categoria: string;
  tipo_origem: "producao_propria" | "revenda";
  ativo: boolean;
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
    categoria: inicial?.categoria ?? categorias[0]?.id ?? "",
    tipo_origem: inicial?.tipo_origem ?? "producao_propria",
    ativo: inicial?.ativo ?? true,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof ProdutoFormValues>(
    k: K,
    v: ProdutoFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
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
            if (!inicial) set("slug", slugify(nome));
          }}
          required
        />
      </Field>

      <Field label="Slug (URL)">
        <input
          className={inputClass}
          value={values.slug}
          onChange={(e) => set("slug", slugify(e.target.value))}
          required
        />
      </Field>

      <Field label="Descrição">
        <textarea
          className={inputClass}
          rows={4}
          value={values.descricao}
          onChange={(e) => set("descricao", e.target.value)}
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
