"use client";

import Image from "next/image";
import { useState } from "react";
import * as api from "@/lib/api";
import { resolveImagem } from "@/lib/format";
import { Button } from "@/components/ui";
import type { ImagemProduto, VariacaoProduto } from "@/lib/types";

/**
 * Upload de imagens de uma variação (multipart para /api/imagens/).
 * Suporta arquivo local (campo `imagem`) ou URL externa (campo `url_externa`).
 */
export function ImageUpload({
  variacao,
  onChange,
}: {
  variacao: VariacaoProduto;
  onChange: (imagens: ImagemProduto[]) => void;
}) {
  const [imagens, setImagens] = useState<ImagemProduto[]>(variacao.imagens);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarArquivo(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("variacao", variacao.id);
      form.append("imagem", file);
      form.append("ordem", String(imagens.length));
      form.append("alt_text", variacao.sku);
      const nova = await api.enviarImagemVariacao(form);
      const lista = [...imagens, nova];
      setImagens(lista);
      onChange(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    await api.excluirImagem(id);
    const lista = imagens.filter((i) => i.id !== id);
    setImagens(lista);
    onChange(lista);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {imagens.map((img) => {
          const src = resolveImagem(img.imagem, img.url_externa);
          return (
            <div
              key={img.id}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-panel-border"
            >
              {src && (
                <Image src={src} alt={img.alt_text} fill className="object-cover" />
              )}
              <button
                onClick={() => remover(img.id)}
                className="absolute right-0 top-0 bg-red-500 px-1 text-xs text-white"
                type="button"
              >
                ×
              </button>
            </div>
          );
        })}

        <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-panel-border text-xs text-slate-400 hover:border-panel-accent">
          {enviando ? "..." : "+ imagem"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviarArquivo(f);
            }}
          />
        </label>
      </div>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
