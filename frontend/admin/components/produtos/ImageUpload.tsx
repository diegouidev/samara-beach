"use client";

import Image from "next/image";
import { useState } from "react";
import * as api from "@/lib/api";
import { resolveImagem } from "@/lib/format";
import { Button, inputClass } from "@/components/ui";
import type { ImagemProduto, VariacaoProduto } from "@/lib/types";

/**
 * Fotos de uma variação (multipart para /api/imagens/).
 * Aceita vários arquivos de uma vez ou uma URL externa.
 * A primeira imagem (menor `ordem`) é a capa usada na loja.
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
  const [urlExterna, setUrlExterna] = useState("");
  const [mostrarUrl, setMostrarUrl] = useState(false);

  function aplicar(lista: ImagemProduto[]) {
    const ordenada = [...lista].sort((a, b) => a.ordem - b.ordem);
    setImagens(ordenada);
    onChange(ordenada);
  }

  async function enviarArquivos(files: FileList) {
    setErro(null);
    setEnviando(true);
    try {
      let lista = imagens;
      for (const [i, file] of Array.from(files).entries()) {
        const form = new FormData();
        form.append("variacao", variacao.id);
        form.append("imagem", file);
        form.append("ordem", String(imagens.length + i));
        form.append(
          "alt_text",
          `${variacao.produto_nome ?? ""} ${variacao.sku}`.trim(),
        );
        lista = [...lista, await api.enviarImagemVariacao(form)];
      }
      aplicar(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setEnviando(false);
    }
  }

  async function adicionarUrl() {
    if (!urlExterna.trim()) return;
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("variacao", variacao.id);
      form.append("url_externa", urlExterna.trim());
      form.append("ordem", String(imagens.length));
      form.append("alt_text", variacao.sku);
      aplicar([...imagens, await api.enviarImagemVariacao(form)]);
      setUrlExterna("");
      setMostrarUrl(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao adicionar a URL.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    await api.excluirImagem(id);
    aplicar(imagens.filter((i) => i.id !== id));
  }

  /** Reordena no backend para a capa valer também na loja. */
  async function definirCapa(id: string) {
    const escolhida = imagens.find((i) => i.id === id);
    if (!escolhida) return;
    const reordenada = [escolhida, ...imagens.filter((i) => i.id !== id)];
    setEnviando(true);
    try {
      await Promise.all(
        reordenada.map((img, ordem) =>
          img.ordem === ordem
            ? Promise.resolve(img)
            : api.atualizarImagem(img.id, { ordem }),
        ),
      );
      aplicar(reordenada.map((img, ordem) => ({ ...img, ordem })));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao definir a capa.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium text-slate-500">
        Fotos {imagens.length > 0 && `(${imagens.length}) — a primeira é a capa`}
      </p>

      <div className="flex flex-wrap gap-2">
        {imagens.map((img, i) => {
          const src = resolveImagem(img.imagem, img.url_externa);
          return (
            <div
              key={img.id}
              className="group relative h-24 w-24 overflow-hidden rounded-lg border border-panel-border bg-slate-50"
            >
              {src && (
                <Image
                  src={src}
                  alt={img.alt_text || "Foto do produto"}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              )}
              {i === 0 && (
                <span className="absolute left-0 top-0 bg-panel-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                  capa
                </span>
              )}
              <button
                onClick={() => remover(img.id)}
                title="Remover foto"
                className="absolute right-0 top-0 bg-red-500 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                type="button"
              >
                ×
              </button>
              {i > 0 && (
                <button
                  onClick={() => definirCapa(img.id)}
                  type="button"
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                >
                  usar como capa
                </button>
              )}
            </div>
          );
        })}

        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-panel-border text-xs text-slate-400 hover:border-panel-accent hover:text-panel-accent">
          {enviando ? (
            "enviando…"
          ) : (
            <>
              <span className="text-lg leading-none">+</span>
              <span className="mt-1">adicionar</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={enviando}
            onChange={(e) => {
              if (e.target.files?.length) enviarArquivos(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {mostrarUrl ? (
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass}
            value={urlExterna}
            onChange={(e) => setUrlExterna(e.target.value)}
            placeholder="https://…/foto.jpg"
          />
          <Button variant="outline" onClick={adicionarUrl}>
            Adicionar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarUrl(true)}
          className="mt-2 text-xs text-slate-400 hover:text-panel-accent"
        >
          ou usar uma URL de imagem
        </button>
      )}

      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
