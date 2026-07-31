import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { getBranding, brandingToCssVars } from "@/lib/branding";

// Metadata dinâmica (título + favicon) a partir do branding configurado.
export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
