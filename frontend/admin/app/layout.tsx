import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { getBranding, brandingToCssVars } from "@/lib/branding";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// A fonte é auto-hospedada pelo Next (sem request ao Google em runtime).
// `variable` alimenta o --fonte-painel usado no tailwind.config.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-painel",
});

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    title: `${b.nome_loja} — Painel Interno`,
    description:
      "Painel de gestão da loja (produtos, estoque, pedidos, financeiro).",
    icons: b.favicon ? { icon: b.favicon } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding();
  const cssVars = brandingToCssVars(branding);

  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
