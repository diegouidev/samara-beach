"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { ImageUpload } from "./ImageUpload";
import type { ImagemProduto, Produto, VariacaoProduto } from "@/lib/types";

/** Grades prontas — o botão preenche a seleção de tamanhos com um clique. */
const GRADES: Record<string, string[]> = {
  "P/M/G": ["P", "M", "G"],
  "P ao GG": ["P", "M", "G", "GG"],
  "PP ao GG": ["PP", "P", "M", "G", "GG"],
  Numérico: ["36", "38", "40", "42", "44"],
  "Único": ["Único"],
};

export function VariacaoManager({ produto }: { produto: Produto }) {
  const [variacoes, setVariacoes] = useState<VariacaoProduto[]>(
    produto.variacoes,
  );
  const [aba, setAba] = useState<"lote" | "individual" | null>(
    produto.variacoes.length === 0 ? "lote" : null,
  );

  function substituir(v: VariacaoProduto) {
    setVariacoes((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-panel-ink">
          Variações e fotos ({variacoes.length})
        </h2>
        <div className="flex gap-2">
          <Button
            variant={aba === "lote" ? "primary" : "outline"}
            onClick={() => setAba(aba === "lote" ? null : "lote")}
          >
            Criar tamanhos em lote
          </Button>
          <Button
            variant={aba === "individual" ? "primary" : "outline"}
            onClick={() => setAba(aba === "individual" ? null : "individual")}
          >
            + Uma variação
          </Button>
        </div>
      </div>

      {variacoes.length === 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Este produto ainda não tem variações. Um produto só aparece na loja
          com preço e estoque quando tem ao menos uma variação (tamanho/cor).
        </p>
      )}

      {aba === "lote" && (
        <VariacoesEmLoteForm
          produtoId={produto.id}
          existentes={variacoes}
          onCriadas={(novas) => {
            setVariacoes((prev) => [...prev, ...novas]);
            setAba(null);
          }}
        />
      )}

      {aba === "individual" && (
        <NovaVariacaoForm
          produtoId={produto.id}
          onCriada={(v) => {
            setVariacoes((prev) => [...prev, v]);
            setAba(null);
          }}
        />
      )}

      <ul className="mt-3 space-y-3">
        {variacoes.map((v) => (
          <VariacaoItem
            key={v.id}
            variacao={v}
            onAtualizada={substituir}
            onExcluida={() =>
              setVariacoes((prev) => prev.filter((x) => x.id !== v.id))
            }
            onImagens={(imagens: ImagemProduto[]) =>
              substituir({ ...v, imagens })
            }
          />
        ))}
      </ul>
    </div>
  );
}

// =========================================================================
// Item da lista: mostra resumo e abre a edição inline
// =========================================================================

function VariacaoItem({
  variacao,
  onAtualizada,
  onExcluida,
  onImagens,
}: {
  variacao: VariacaoProduto;
  onAtualizada: (v: VariacaoProduto) => void;
  onExcluida: () => void;
  onImagens: (imagens: ImagemProduto[]) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarAtivo() {
    try {
      onAtualizada(
        await api.atualizarVariacao(variacao.id, { ativo: !variacao.ativo }),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  async function excluir() {
    if (!confirm(`Excluir a variação ${variacao.sku}?`)) return;
    try {
      await api.excluirVariacao(variacao.id);
      onExcluida();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  const rotulo =
    [variacao.cor, variacao.tamanho].filter(Boolean).join(" · ") || "Padrão";

  return (
    <li className="rounded-lg border border-panel-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-panel-ink">{rotulo}</span>{" "}
          <span className="font-mono text-xs text-slate-400">{variacao.sku}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">
            {formatBRL(variacao.preco_vigente)}
          </span>
          {variacao.preco_promocional && (
            <span className="text-xs text-slate-400 line-through">
              {formatBRL(variacao.preco)}
            </span>
          )}
          <Badge tone={variacao.ativo ? "green" : "red"}>
            {variacao.ativo ? "ativa" : "inativa"}
          </Badge>
        </div>
      </div>

      <div className="mt-2 flex gap-3 text-xs">
        <button
          onClick={() => setEditando((v) => !v)}
          className="text-panel-accent hover:underline"
        >
          {editando ? "Fechar edição" : "Editar"}
        </button>
        <button onClick={alternarAtivo} className="text-slate-500 hover:underline">
          {variacao.ativo ? "Desativar" : "Ativar"}
        </button>
        <button onClick={excluir} className="text-red-500 hover:underline">
          Excluir
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      {editando && (
        <EditarVariacaoForm
          variacao={variacao}
          onSalva={(v) => {
            onAtualizada(v);
            setEditando(false);
          }}
        />
      )}

      <ImageUpload variacao={variacao} onChange={onImagens} />
    </li>
  );
}

function EditarVariacaoForm({
  variacao,
  onSalva,
}: {
  variacao: VariacaoProduto;
  onSalva: (v: VariacaoProduto) => void;
}) {
  const [valores, setValores] = useState({
    cor: variacao.cor,
    tamanho: variacao.tamanho,
    sku: variacao.sku,
    preco: variacao.preco,
    preco_promocional: variacao.preco_promocional ?? "",
    custo_medio: variacao.custo_medio ?? "",
    peso_gramas: variacao.peso_gramas?.toString() ?? "",
    estoque_minimo: String(variacao.estoque_minimo),
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function set(campo: keyof typeof valores, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      onSalva(
        await api.atualizarVariacao(variacao.id, {
          cor: valores.cor,
          tamanho: valores.tamanho,
          sku: valores.sku,
          preco: valores.preco,
          // Campos numéricos opcionais: string vazia significa "sem valor".
          preco_promocional: valores.preco_promocional || null,
          custo_medio: valores.custo_medio || null,
          peso_gramas: valores.peso_gramas ? Number(valores.peso_gramas) : null,
          estoque_minimo: Number(valores.estoque_minimo || 0),
        }),
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={salvar}
      className="mt-3 rounded-lg bg-slate-50 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cor">
          <input
            className={inputClass}
            value={valores.cor}
            onChange={(e) => set("cor", e.target.value)}
          />
        </Field>
        <Field label="Tamanho">
          <input
            className={inputClass}
            value={valores.tamanho}
            onChange={(e) => set("tamanho", e.target.value)}
          />
        </Field>
        <Field label="SKU">
          <input
            className={inputClass}
            value={valores.sku}
            onChange={(e) => set("sku", e.target.value)}
          />
        </Field>
        <Field label="Preço (R$)">
          <input
            className={inputClass}
            value={valores.preco}
            onChange={(e) => set("preco", e.target.value)}
            required
          />
        </Field>
        <Field label="Preço promocional">
          <input
            className={inputClass}
            value={valores.preco_promocional}
            onChange={(e) => set("preco_promocional", e.target.value)}
            placeholder="opcional"
          />
        </Field>
        <Field label="Custo médio">
          <input
            className={inputClass}
            value={valores.custo_medio}
            onChange={(e) => set("custo_medio", e.target.value)}
            placeholder="usado no relatório de margem"
          />
        </Field>
        <Field label="Peso (g)">
          <input
            className={inputClass}
            type="number"
            value={valores.peso_gramas}
            onChange={(e) => set("peso_gramas", e.target.value)}
            placeholder="frete"
          />
        </Field>
        <Field label="Estoque mínimo">
          <input
            className={inputClass}
            type="number"
            value={valores.estoque_minimo}
            onChange={(e) => set("estoque_minimo", e.target.value)}
          />
        </Field>
      </div>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar variação"}
        </Button>
      </div>
    </form>
  );
}

// =========================================================================
// Criação em lote: escolhe os tamanhos e cria todos de uma vez
// =========================================================================

function VariacoesEmLoteForm({
  produtoId,
  existentes,
  onCriadas,
}: {
  produtoId: string;
  existentes: VariacaoProduto[];
  onCriadas: (novas: VariacaoProduto[]) => void;
}) {
  const [tamanhos, setTamanhos] = useState<string[]>([]);
  const [tamanhoLivre, setTamanhoLivre] = useState("");
  const [cor, setCor] = useState("");
  const [preco, setPreco] = useState("");
  const [custo, setCusto] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alternar(tamanho: string) {
    setTamanhos((prev) =>
      prev.includes(tamanho)
        ? prev.filter((t) => t !== tamanho)
        : [...prev, tamanho],
    );
  }

  function adicionarLivre() {
    const novo = tamanhoLivre.trim();
    if (novo && !tamanhos.includes(novo)) setTamanhos((prev) => [...prev, novo]);
    setTamanhoLivre("");
  }

  /** A combinação produto+cor+tamanho é única no banco; avisa antes de tentar. */
  const duplicados = tamanhos.filter((t) =>
    existentes.some(
      (v) =>
        v.tamanho.toLowerCase() === t.toLowerCase() &&
        v.cor.toLowerCase() === cor.trim().toLowerCase(),
    ),
  );

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (tamanhos.length === 0) {
      setErro("Escolha ao menos um tamanho.");
      return;
    }
    if (duplicados.length > 0) {
      setErro(
        `Já existe variação para: ${duplicados.join(", ")} nesta cor. Desmarque-os.`,
      );
      return;
    }

    setEnviando(true);
    try {
      // Sequencial de propósito: o SKU é gerado no backend e precisa enxergar
      // os anteriores para não repetir.
      const novas: VariacaoProduto[] = [];
      for (const tamanho of tamanhos) {
        novas.push(
          await api.criarVariacao({
            produto: produtoId,
            cor: cor.trim(),
            tamanho,
            preco,
            custo_medio: custo || null,
            estoque_minimo: Number(estoqueMinimo || 0),
          }),
        );
      }
      onCriadas(novas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar variações.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={salvar}
      className="rounded-lg border border-dashed border-panel-border p-4"
    >
      <p className="mb-3 text-sm text-slate-500">
        Escolha os tamanhos: cada um vira uma variação com o mesmo preço e cor.
        O SKU é gerado automaticamente.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {Object.entries(GRADES).map(([nome, valores]) => (
          <button
            key={nome}
            type="button"
            onClick={() => setTamanhos(valores)}
            className="rounded-full border border-panel-border px-3 py-1 text-xs text-slate-500 hover:border-panel-accent hover:text-panel-accent"
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {Array.from(
          new Set([...Object.values(GRADES).flat(), ...tamanhos]),
        ).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => alternar(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              tamanhos.includes(t)
                ? "border-panel-accent bg-panel-accent text-white"
                : "border-panel-border text-slate-600 hover:border-panel-accent"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <input
          className={inputClass}
          value={tamanhoLivre}
          onChange={(e) => setTamanhoLivre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionarLivre();
            }
          }}
          placeholder="outro tamanho (ex.: 46)"
        />
        <Button variant="outline" onClick={adicionarLivre}>
            Incluir
          </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cor (opcional)">
          <input
            className={inputClass}
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            placeholder="Preto"
          />
        </Field>
        <Field label="Preço (R$)">
          <input
            className={inputClass}
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="199.90"
            required
          />
        </Field>
        <Field label="Custo médio (opcional)">
          <input
            className={inputClass}
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            placeholder="80.00"
          />
        </Field>
        <Field label="Estoque mínimo">
          <input
            className={inputClass}
            type="number"
            value={estoqueMinimo}
            onChange={(e) => setEstoqueMinimo(e.target.value)}
          />
        </Field>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <div className="mt-3">
        <Button type="submit" disabled={enviando}>
          {enviando
            ? "Criando…"
            : `Criar ${tamanhos.length || ""} variação(ões)`}
        </Button>
      </div>
    </form>
  );
}

// =========================================================================
// Criação individual (controle total sobre SKU e preços)
// =========================================================================

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
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [custo, setCusto] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      onCriada(
        await api.criarVariacao({
          produto: produtoId,
          cor,
          tamanho,
          sku, // vazio → o backend gera
          preco,
          preco_promocional: precoPromocional || null,
          custo_medio: custo || null,
          estoque_minimo: Number(estoqueMinimo || 0),
        }),
      );
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
          <input
            className={inputClass}
            value={cor}
            onChange={(e) => setCor(e.target.value)}
          />
        </Field>
        <Field label="Tamanho">
          <input
            className={inputClass}
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
          />
        </Field>
        <Field label="SKU (deixe vazio para gerar)">
          <input
            className={inputClass}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </Field>
        <Field label="Preço (R$)">
          <input
            className={inputClass}
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="199.90"
            required
          />
        </Field>
        <Field label="Preço promocional">
          <input
            className={inputClass}
            value={precoPromocional}
            onChange={(e) => setPrecoPromocional(e.target.value)}
            placeholder="opcional"
          />
        </Field>
        <Field label="Custo médio">
          <input
            className={inputClass}
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            placeholder="opcional"
          />
        </Field>
        <Field label="Estoque mínimo">
          <input
            className={inputClass}
            type="number"
            value={estoqueMinimo}
            onChange={(e) => setEstoqueMinimo(e.target.value)}
          />
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
