"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { ImageUpload } from "./ImageUpload";
import type { ImagemProduto, Produto, VariacaoProduto } from "@/lib/types";

export function VariacaoManager({ produto }: { produto: Produto }) {
  const [variacoes, setVariacoes] = useState<VariacaoProduto[]>(
    produto.variacoes,
  );
  const [mostrarForm, setMostrarForm] = useState(false);

  function atualizarImagensDe(varId: string, imagens: ImagemProduto[]) {
    setVariacoes((prev) =>
      prev.map((v) => (v.id === varId ? { ...v, imagens } : v)),
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-panel-ink">
          Variações ({variacoes.length})
        </h2>
        <Button variant="outline" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Variação"}
        </Button>
      </div>

      {mostrarForm && (
        <NovaVariacaoForm
          produtoId={produto.id}
          onCriada={(v) => {
            setVariacoes((prev) => [...prev, v]);
            setMostrarForm(false);
          }}
        />
      )}

      <ul className="mt-3 space-y-3">
        {variacoes.map((v) => (
          <li
            key={v.id}
            className="rounded-lg border border-panel-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-panel-ink">
                  {[v.cor, v.tamanho].filter(Boolean).join(" · ") || "Padrão"}
                </span>{" "}
                <span className="text-sm text-slate-400">{v.sku}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>R$ {v.preco_vigente}</span>
                <Badge tone={v.ativo ? "green" : "red"}>
                  {v.ativo ? "ativa" : "inativa"}
                </Badge>
              </div>
            </div>
            <ImageUpload
              variacao={v}
              onChange={(imgs) => atualizarImagensDe(v.id, imgs)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NovaVariacaoForm({
  produtoId,
  onCriada,
}: {
  produtoId: string;
  onCriada: (v: VariacaoProduto) => void;
}) {
  const [cor, setCor] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [sku, setSku] = useState("");
  const [preco, setPreco] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const v = await api.criarVariacao({
        produto: produtoId,
        cor,
        tamanho,
        sku,
        preco,
        estoque_minimo: Number(estoqueMinimo),
      });
      onCriada(v);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar variação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={salvar}
      className="rounded-lg border border-dashed border-panel-border p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Cor">
          <input className={inputClass} value={cor} onChange={(e) => setCor(e.target.value)} />
        </Field>
        <Field label="Tamanho">
          <input className={inputClass} value={tamanho} onChange={(e) => setTamanho(e.target.value)} />
        </Field>
        <Field label="SKU">
          <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} required />
        </Field>
        <Field label="Preço">
          <input className={inputClass} value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="199.90" required />
        </Field>
        <Field label="Estoque mínimo">
          <input className={inputClass} type="number" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />
        </Field>
      </div>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Adicionar variação"}
        </Button>
      </div>
    </form>
  );
}
