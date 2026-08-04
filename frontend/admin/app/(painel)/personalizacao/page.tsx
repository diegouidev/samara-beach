"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  atualizarBranding,
  getBranding,
  type Branding,
} from "@/lib/branding";
import { resolveImagem } from "@/lib/format";
import { Alerta, Button, Card, Field, PageHeader, inputClass, textareaClass } from "@/components/ui";
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
  const [banner, setBanner] = useState<File | null>(null);
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
      // Campos do hero (topo da home).
      form.append("hero_modo", branding.hero_modo);
      form.append("hero_imagem_link", branding.hero_imagem_link ?? "");
      form.append("hero_badge", branding.hero_badge ?? "");
      form.append("hero_titulo", branding.hero_titulo ?? "");
      form.append("hero_subtitulo", branding.hero_subtitulo ?? "");
      form.append("hero_cta_texto", branding.hero_cta_texto ?? "");
      form.append("hero_cta_link", branding.hero_cta_link ?? "");
      if (logo) form.append("logo", logo);
      if (favicon) form.append("favicon", favicon);
      if (banner) form.append("hero_imagem", banner);
      const atualizado = await atualizarBranding(form);
      setBranding(atualizado);
      setLogo(null);
      setFavicon(null);
      setBanner(null);
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

      {/* Banner / topo da home */}
      <Card className="mb-6">
        <h2 className="mb-1 font-semibold text-panel-ink">Banner da home</h2>
        <p className="mb-4 text-sm text-panel-inkMuted">
          Escolha como o topo da loja aparece.
        </p>

        {/* Seletor de modo */}
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["texto", "Somente textos", "Sem imagem — só título, subtítulo e botão."],
              ["foto", "Foto + textos", "Imagem de fundo com os textos por cima."],
              ["banner", "Banner pronto", "Só a imagem (arte já com os textos)."],
            ] as const
          ).map(([modo, titulo, desc]) => (
            <button
              key={modo}
              type="button"
              onClick={() => set("hero_modo", modo)}
              className={`rounded-xl border p-3 text-left transition ${
                branding.hero_modo === modo
                  ? "border-panel-accent bg-panel-accent/5"
                  : "border-panel-border hover:border-panel-accent/50"
              }`}
            >
              <span className="block text-sm font-medium text-panel-ink">
                {titulo}
              </span>
              <span className="mt-0.5 block text-xs text-panel-inkMuted">
                {desc}
              </span>
            </button>
          ))}
        </div>

        {/* Imagem — aparece nos modos foto e banner */}
        {branding.hero_modo !== "texto" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={
                branding.hero_modo === "banner"
                  ? "Imagem do banner (arte pronta)"
                  : "Imagem de fundo"
              }
              hint="Recomendado: 1600×700px, JPG ou PNG."
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {(banner || branding.hero_imagem) && (
                <div className="relative mt-2 h-28 w-full overflow-hidden rounded-lg border border-panel-border">
                  <Image
                    src={
                      banner
                        ? URL.createObjectURL(banner)
                        : resolveImagem(branding.hero_imagem) ?? ""
                    }
                    alt="banner"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
            </Field>
            {branding.hero_modo === "banner" && (
              <Field label="Link do banner" hint="Para onde leva ao clicar. Ex.: /produtos">
                <input
                  className={inputClass}
                  value={branding.hero_imagem_link}
                  onChange={(e) => set("hero_imagem_link", e.target.value)}
                  placeholder="/produtos"
                />
              </Field>
            )}
          </div>
        )}

        {/* Textos — aparecem nos modos texto e foto */}
        {branding.hero_modo !== "banner" && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Selo (badge)">
                <input
                  className={inputClass}
                  value={branding.hero_badge}
                  onChange={(e) => set("hero_badge", e.target.value)}
                  placeholder="Nova coleção de verão"
                />
              </Field>
              <Field label="Título">
                <input
                  className={inputClass}
                  value={branding.hero_titulo}
                  onChange={(e) => set("hero_titulo", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Subtítulo">
              <textarea
                className={textareaClass}
                rows={2}
                value={branding.hero_subtitulo}
                onChange={(e) => set("hero_subtitulo", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Texto do botão">
                <input
                  className={inputClass}
                  value={branding.hero_cta_texto}
                  onChange={(e) => set("hero_cta_texto", e.target.value)}
                  placeholder="Ver coleção"
                />
              </Field>
              <Field label="Link do botão">
                <input
                  className={inputClass}
                  value={branding.hero_cta_link}
                  onChange={(e) => set("hero_cta_link", e.target.value)}
                  placeholder="/produtos"
                />
              </Field>
            </div>
          </div>
        )}
      </Card>

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
