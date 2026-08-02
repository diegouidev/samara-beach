"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getBranding, type Branding } from "@/lib/branding";
import { resolveImagem } from "@/lib/format";
import { Alerta, Button, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const { usuario, carregando, entrar } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    if (!carregando && usuario) router.replace("/dashboard");
  }, [carregando, usuario, router]);

  useEffect(() => {
    getBranding(0)
      .then(setBranding)
      .catch(() => setBranding(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      router.replace("/dashboard");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setEnviando(false);
    }
  }

  const logo = resolveImagem(branding?.logo ?? null);
  const nomeLoja = branding?.nome_loja ?? "Samara Beach";

  return (
    <div className="flex min-h-screen">
      {/* Painel de marca — some no mobile para dar espaço ao formulário. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-panel-brandDark p-12 lg:flex">
        <div
          className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--cor-primaria, #0891b2)" }}
        />
        <div
          className="absolute -bottom-32 -right-16 h-[380px] w-[380px] rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--cor-destaque, #fb7185)" }}
        />

        <div className="relative">
          {logo ? (
            <span className="relative block h-12 w-44">
              <Image
                src={logo}
                alt={nomeLoja}
                fill
                sizes="176px"
                className="object-contain object-left"
                priority
                unoptimized
              />
            </span>
          ) : (
            <p className="text-xl font-semibold text-white">{nomeLoja}</p>
          )}
        </div>

        <div className="relative max-w-sm">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Tudo da loja
            <br />
            em um lugar só.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Catálogo, estoque, pedidos da loja online, vendas do balcão e
            fechamento de caixa — no mesmo painel.
          </p>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} {nomeLoja}
        </p>
      </div>

      {/* Formulário */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {logo && (
            <span className="relative mb-8 block h-11 w-40 lg:hidden">
              <Image
                src={logo}
                alt={nomeLoja}
                fill
                sizes="160px"
                className="object-contain object-left"
                unoptimized
              />
            </span>
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-panel-ink">
            Entrar no painel
          </h1>
          <p className="mt-1 text-sm text-panel-inkMuted">
            Acesso restrito à equipe da loja.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="voce@samarabeach.com"
                className={inputClass}
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>

            {erro && <Alerta tone="erro">{erro}</Alerta>}

            <Button type="submit" disabled={enviando} className="w-full">
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
