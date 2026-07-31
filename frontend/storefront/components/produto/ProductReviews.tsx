"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Avaliacao } from "@/lib/types";

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="text-brand-coral">
      {"★".repeat(nota)}
      <span className="text-gray-300">{"★".repeat(5 - nota)}</span>
    </span>
  );
}

export function ProductReviews({ produtoId }: { produtoId: string }) {
  const { usuario } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!produtoId.startsWith("mock")) {
      api.listarAvaliacoes(produtoId).then(setAvaliacoes);
    }
  }, [produtoId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMsg(null);
    try {
      await api.criarAvaliacao({ produto: produtoId, nota, comentario });
      setComentario("");
      setMsg("Obrigado! Sua avaliação será publicada após moderação.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar avaliação.");
    }
  }

  const media =
    avaliacoes.length > 0
      ? (
          avaliacoes.reduce((a, r) => a + r.nota, 0) / avaliacoes.length
        ).toFixed(1)
      : null;

  return (
    <section className="mt-12 border-t border-gray-100 pt-8">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-brand-ink">Avaliações</h2>
        {media && (
          <span className="text-sm text-gray-500">
            {media} / 5 · {avaliacoes.length} avaliação(ões)
          </span>
        )}
      </div>

      {avaliacoes.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          Este produto ainda não tem avaliações. Seja a primeira pessoa a avaliar!
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {avaliacoes.map((a) => (
            <li key={a.id} className="rounded-xl border border-gray-100 p-4">
              <Estrelas nota={a.nota} />
              {a.comentario && (
                <p className="mt-1 text-sm text-gray-600">{a.comentario}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Formulário — apenas para clientes logados */}
      <div className="mt-8 rounded-xl bg-brand-sand/40 p-5">
        <h3 className="font-semibold text-brand-ink">Deixe sua avaliação</h3>
        {usuario ? (
          <form onSubmit={enviar} className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Nota:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  className={`text-xl ${
                    n <= nota ? "text-brand-coral" : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte como foi sua experiência..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-sea focus:outline-none"
            />
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            {msg && <p className="text-sm text-brand-sea">{msg}</p>}
            <button
              type="submit"
              className="rounded-full bg-brand-sea px-6 py-2 text-sm font-medium text-white hover:bg-brand-seaDark"
            >
              Enviar avaliação
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Entre na sua conta para avaliar este produto.
          </p>
        )}
      </div>
    </section>
  );
}
