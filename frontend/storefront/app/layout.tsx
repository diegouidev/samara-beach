import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { getBranding, brandingToCssVars } from "@/lib/branding";

// Escala correta no mobile; permite zoom do usuário (acessibilidade).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Metadata dinâmica (título + favicon) a partir do branding configurado.
export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  // Loja desligada: não há catálogo para indexar, e a página é uma só.
  if (!b.loja_online_ativa) {
    return {
      title: `${b.nome_loja} — Moda Praia`,
      description:
        "Visite nossa loja física ou fale com a gente pelo WhatsApp.",
      icons: b.favicon ? { icon: b.favicon } : undefined,
      robots: { index: true, follow: false },
    };
  }
  return {
    title: {
      default: `${b.nome_loja} — Moda Praia`,
      template: `%s | ${b.nome_loja}`,
    },
    description:
      "Biquínis, maiôs, saídas de praia e acessórios. Moda praia com produção própria e curadoria.",
    icons: b.favicon ? { icon: b.favicon } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding();
  // Injeta as cores da marca como CSS variables no :root (sem flash no SSR).
  const cssVars = brandingToCssVars(branding);

  return (
    <html lang="pt-BR">
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }}
        />
      </head>
      <body className="min-h-screen bg-white antialiased">
        {/* Sem loja online não há conta de cliente — o provider nem monta. */}
        {branding.loja_online_ativa ? (
          <AuthProvider>{children}</AuthProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
