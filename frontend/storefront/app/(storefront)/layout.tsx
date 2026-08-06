import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getBranding } from "@/lib/branding";
import { listarCategorias } from "@/lib/api";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Logo, nome da loja e menu vêm do painel (Personalização/Categorias) — sem rebuild.
  const [branding, categorias] = await Promise.all([
    getBranding(),
    listarCategorias(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header branding={branding} categorias={categorias} />
      <main className="flex-1">{children}</main>
      <Footer branding={branding} />
    </div>
  );
}
