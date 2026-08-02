"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  atualizarBranding,
  getBranding,
  type Branding,
} from "@/lib/branding";
import { resolveImagem } from "@/lib/format";
import { Alerta, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function PersonalizacaoPage() {
  return (
    <RequireAuth papeis={["admin"]}>
      <PersonalizacaoContent />
    </RequireAuth>
  );
}

const CORES: { chave: keyof Branding; label: string }[] = [
  { chave: "cor_primaria", label: "Primária (marca)" },
  { chave: "cor_secundaria", label: "Secundária (hover)" },
  { chave: "cor_destaque", label: "Destaque (CTA)" },
  { chave: "cor_fundo", label: "Fundo suave" },
  { chave: "cor_texto", label: "Texto" },
];

function PersonalizacaoContent() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getBranding(0).then(setBranding);
  }, []);

  if (!branding) return <p className="text-slate-400">Carregando…</p>;

  function set<K extends keyof Branding>(k: K, v: Branding[K]) {
    setBranding((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function salvar() {
    if (!branding) return;
    setErro(null);
    setMsg(null);
    setSalvando(true);
    try {
      const form = new FormData();
      form.append("nome_loja", branding.nome_loja);
      form.append("whatsapp", branding.whatsapp ?? "");
      for (const { chave } of CORES) {
        form.append(chave, String(branding[chave]));
      }
      if (logo) form.append("logo", logo);
      if (favicon) form.append("favicon", favicon);
      const atualizado = await atualizarBranding(form);
      setBranding(atualizado);
      setLogo(null);
      setFavicon(null);
      setMsg("Identidade visual salva! Recarregue os sites para ver aplicada.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Personalização"
        subtitle="Cores da marca, logo e favicon — aplicados na loja e no painel"
      />

      {msg && (
        <Alerta tone="sucesso">{msg}</Alerta>
      )}
      {erro && (
        <Alerta tone="erro">{erro}</Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">Identidade</h2>
          <div className="space-y-4">
            <Field label="Nome da loja">
              <input
                className={inputClass}
                value={branding.nome_loja}
                onChange={(e) => set("nome_loja", e.target.value)}
              />
            </Field>

            <Field
              label="WhatsApp da loja"
              hint="Com DDI e DDD, só números. É para onde o checkout da loja online leva o pedido."
            >
              <input
                className={inputClass}
                value={branding.whatsapp ?? ""}
                onChange={(e) =>
                  set("whatsapp", e.target.value.replace(/\D/g, ""))
                }
                placeholder="5511999998888"
                inputMode="numeric"
              />
            </Field>

            {CORES.map(({ chave, label }) => (
              <Field key={chave} label={label}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={String(branding[chave])}
                    onChange={(e) => set(chave, e.target.value as never)}
                    className="h-9 w-12 cursor-pointer rounded border border-panel-border"
                  />
                  <input
                    className={inputClass}
                    value={String(branding[chave])}
                    onChange={(e) => set(chave, e.target.value as never)}
                  />
                </div>
              </Field>
            ))}

            <Field label="Logomarca">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </Field>
            <Field label="Favicon">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFavicon(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </Field>

            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar personalização"}
            </Button>
          </div>
        </Card>

        {/* Preview ao vivo */}
        <Card>
          <h2 className="mb-4 font-semibold text-panel-ink">Prévia</h2>
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: branding.cor_fundo }}
          >
            <div className="flex items-center gap-3">
              {(logo || branding.logo) && (
                <div className="relative h-10 w-10 overflow-hidden rounded">
                  <Image
                    src={
                      logo
                        ? URL.createObjectURL(logo)
                        : resolveImagem(branding.logo) ?? ""
                    }
                    alt="logo"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <span
                className="text-xl font-bold"
                style={{ color: branding.cor_texto }}
              >
                {branding.nome_loja}
              </span>
            </div>

            <p className="mt-4 text-sm" style={{ color: branding.cor_texto }}>
              Exemplo de texto na cor de texto configurada.
            </p>

            <div className="mt-4 flex gap-3">
              <span
                className="rounded-full px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: branding.cor_primaria }}
              >
                Botão primário
              </span>
              <span
                className="rounded-full px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: branding.cor_destaque }}
              >
                Comprar agora
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            As cores são aplicadas em runtime nos dois sites (via CSS variables).
            Recarregue a loja/painel após salvar.
          </p>
        </Card>
      </div>
    </div>
  );
}
