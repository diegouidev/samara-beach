"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { slugify } from "@/lib/masks";
import { resolveImagem } from "@/lib/format";
import { Alerta, Badge, Button, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { Categoria } from "@/lib/types";

export default function CategoriasPage() {
  return (
    <RequireAuth papeis={["admin", "estoque"]}>
      <CategoriasContent />
    </RequireAuth>
  );
}

function CategoriasContent() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function avisar(texto: string) {
    setMsg(texto);
    setTimeout(() => setMsg(null), 2500);
  }

  async function carregar() {
    try {
      setCategorias(await api.listarCategorias());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar categorias.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarAtivo(categoria: Categoria) {
    await api.atualizarCategoria(categoria.slug, { ativo: !categoria.ativo });
    avisar(categoria.ativo ? "Categoria desativada." : "Categoria ativada.");
    carregar();
  }

  async function excluir(categoria: Categoria) {
    if (!confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    try {
      await api.excluirCategoria(categoria.slug);
      avisar("Categoria excluída.");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle={`${categorias.length} categoria(s) — organizam o catálogo da loja`}
        action={
          <Button
            onClick={() => {
              setEditando(null);
              setMostrarForm((v) => !v);
            }}
          >
            {mostrarForm && !editando ? "Cancelar" : "+ Nova categoria"}
          </Button>
        }
      />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}
      {erro && (
        <Alerta tone="erro">{erro}</Alerta>
      )}

      {(mostrarForm || editando) && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-panel-ink">
            {editando ? `Editar "${editando.nome}"` : "Nova categoria"}
          </h2>
          <CategoriaForm
            key={editando?.id ?? "nova"}
            inicial={editando}
            categorias={categorias}
            onCancelar={() => {
              setEditando(null);
              setMostrarForm(false);
            }}
            onSalvo={() => {
              setEditando(null);
              setMostrarForm(false);
              avisar(editando ? "Categoria atualizada." : "Categoria criada.");
              carregar();
            }}
          />
        </Card>
      )}

      <Card bare>
        {carregando ? (
          <EmptyState titulo={"Carregando…"} />
        ) : categorias.length === 0 ? (
          <EmptyState titulo={"Nenhuma categoria cadastrada. Crie a primeira para poder cadastrar             produtos."} />
        ) : (
          <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Slug (URL)</th>
                <th>Categoria pai</th>
                <th className="text-right">Produtos</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-panel-ink">
                    <div className="flex items-center gap-3">
                      <span className="relative h-9 w-12 flex-shrink-0 overflow-hidden rounded-md bg-panel-surfaceMuted">
                        {c.imagem && (
                          <Image
                            src={resolveImagem(c.imagem) ?? ""}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </span>
                      {c.nome}
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-500">
                    {c.slug}
                  </td>
                  <td className="text-slate-600">
                    {c.categoria_pai_nome ?? "—"}
                  </td>
                  <td className="text-right text-slate-600">
                    {c.total_produtos}
                  </td>
                  <td>
                    <Badge tone={c.ativo ? "green" : "red"}>
                      {c.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex justify-end gap-3 text-xs">
                      <button
                        onClick={() => {
                          setEditando(c);
                          setMostrarForm(false);
                          setErro(null);
                        }}
                        className="text-panel-accent hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarAtivo(c)}
                        className="text-slate-500 hover:underline"
                      >
                        {c.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CategoriaForm({
  inicial,
  categorias,
  onSalvo,
  onCancelar,
}: {
  inicial: Categoria | null;
  categorias: Categoria[];
  onSalvo: () => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  const [pai, setPai] = useState(inicial?.categoria_pai ?? "");
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [destaque, setDestaque] = useState(inicial?.destaque ?? true);
  const [ordem, setOrdem] = useState(String(inicial?.ordem ?? 0));
  const [imagem, setImagem] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("nome", nome);
      form.append("slug", slug || slugify(nome));
      form.append("categoria_pai", pai || "");
      form.append("ativo", String(ativo));
      form.append("destaque", String(destaque));
      form.append("ordem", ordem || "0");
      if (imagem) form.append("imagem", imagem);

      if (inicial) {
        await api.atualizarCategoriaMultipart(inicial.slug, form);
      } else {
        await api.criarCategoriaMultipart(form);
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome">
          <input
            className={inputClass}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              // No cadastro o slug acompanha o nome; na edição preserva a URL.
              if (!inicial) setSlug(slugify(e.target.value));
            }}
            placeholder="Biquínis"
            required
          />
        </Field>
        <Field label="Slug (URL)">
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="biquinis"
            required
          />
        </Field>
        <Field label="Categoria pai (opcional)">
          <select
            className={inputClass}
            value={pai ?? ""}
            onChange={(e) => setPai(e.target.value)}
          >
            <option value="">— nenhuma (categoria principal)</option>
            {categorias
              .filter((c) => c.id !== inicial?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </Field>
      </div>

      {/* Card na home: imagem + ordem + destaque */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imagem do card (home)" hint="Aparece na vitrine de categorias. Recomendado 600×450px.">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagem(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {(imagem || inicial?.imagem) && (
            <div className="relative mt-2 h-24 w-40 overflow-hidden rounded-lg border border-panel-border">
              <Image
                src={
                  imagem
                    ? URL.createObjectURL(imagem)
                    : resolveImagem(inicial?.imagem ?? null) ?? ""
                }
                alt="prévia"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </Field>
        <Field label="Ordem na home" hint="Menor aparece primeiro.">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Categoria ativa (aparece na loja)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={destaque}
            onChange={(e) => setDestaque(e.target.checked)}
          />
          Mostrar na vitrine de categorias (home)
        </label>
      </div>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : inicial ? "Salvar alterações" : "Criar categoria"}
        </Button>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
