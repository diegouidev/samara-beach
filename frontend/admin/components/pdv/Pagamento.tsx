"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import { Button, Field, inputClass } from "@/components/ui";
import { METODOS_PDV, type MetodoPagamento } from "@/lib/types";

export interface LinhaPagamento {
  metodo: MetodoPagamento;
  valor: string;
  parcelas: number;
  /** Só em dinheiro: quanto a cliente entregou (base do troco). */
  valor_recebido?: string;
}

export function somaPagamentos(linhas: LinhaPagamento[]): number {
  return linhas.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
}

export function trocoDe(linhas: LinhaPagamento[]): number {
  return linhas.reduce((acc, l) => {
    if (l.metodo !== "dinheiro" || !l.valor_recebido) return acc;
    return acc + Math.max(0, Number(l.valor_recebido) - (Number(l.valor) || 0));
  }, 0);
}

/**
 * Formas de pagamento da venda. Aceita divisão entre formas; o botão de
 * finalizar só libera quando a soma bate exatamente com o total.
 */
export function Pagamento({
  total,
  linhas,
  onChange,
}: {
  total: number;
  linhas: LinhaPagamento[];
  onChange: (linhas: LinhaPagamento[]) => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPagamento>("dinheiro");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [recebido, setRecebido] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const pago = somaPagamentos(linhas);
  const restante = Math.max(0, total - pago);

  function adicionar() {
    setErro(null);
    // Sem valor digitado, assume o que falta para fechar a venda.
    const bruto = Number(valor || restante);
    if (!bruto || bruto <= 0) {
      setErro("Informe o valor do pagamento.");
      return;
    }
    if (bruto > restante + 0.001) {
      setErro(
        `Esse valor passa do que falta (${formatBRL(restante)}). Em dinheiro, ` +
          "informe o valor do pagamento e o valor recebido separadamente.",
      );
      return;
    }
    if (metodo === "dinheiro" && recebido && Number(recebido) < bruto) {
      setErro("O valor recebido é menor que o pagamento.");
      return;
    }

    onChange([
      ...linhas,
      {
        metodo,
        valor: bruto.toFixed(2),
        parcelas: metodo === "credito" ? Number(parcelas) || 1 : 1,
        valor_recebido:
          metodo === "dinheiro" && recebido
            ? Number(recebido).toFixed(2)
            : undefined,
      },
    ]);
    setValor("");
    setRecebido("");
    setParcelas("1");
  }

  const troco = trocoDe(linhas);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {METODOS_PDV.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => setMetodo(m.valor)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              metodo === m.valor
                ? "border-panel-accent bg-panel-accent text-white"
                : "border-panel-border text-slate-600 hover:border-panel-accent"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`Valor (falta ${formatBRL(restante)})`}>
          <input
            className={inputClass}
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(",", "."))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
            placeholder={restante.toFixed(2)}
            inputMode="decimal"
          />
        </Field>

        {metodo === "dinheiro" && (
          <Field label="Valor recebido (para troco)">
            <input
              className={inputClass}
              value={recebido}
              onChange={(e) => setRecebido(e.target.value.replace(",", "."))}
              placeholder="opcional"
              inputMode="decimal"
            />
          </Field>
        )}

        {metodo === "credito" && (
          <Field label="Parcelas">
            <select
              className={inputClass}
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex items-end">
          <Button onClick={adicionar} disabled={restante <= 0}>
            Adicionar pagamento
          </Button>
        </div>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      {linhas.length > 0 && (
        <ul className="mt-3 divide-y divide-panel-border rounded-lg border border-panel-border">
          {linhas.map((l, i) => (
            <li
              key={`${l.metodo}-${i}`}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>
                {METODOS_PDV.find((m) => m.valor === l.metodo)?.label ??
                  l.metodo}
                {l.parcelas > 1 && ` ${l.parcelas}x`}
                {l.valor_recebido && (
                  <span className="text-xs text-slate-400">
                    {" "}
                    · recebido {formatBRL(l.valor_recebido)}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-medium">{formatBRL(l.valor)}</span>
                <button
                  type="button"
                  onClick={() => onChange(linhas.filter((_, j) => j !== i))}
                  className="text-xs text-red-500 hover:underline"
                >
                  remover
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {troco > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Troco: {formatBRL(troco)}
        </p>
      )}
    </div>
  );
}
