import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getBranding } from "@/lib/branding";
import { getEmpresa } from "@/lib/empresa";
import { listarCategorias } from "@/lib/api";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Logo, menu e dados da empresa vêm do painel — sem rebuild.
  const [branding, categorias, empresa] = await Promise.all([
    getBranding(),
    listarCategorias(),
    getEmpresa(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header branding={branding} categorias={categorias} />
      <main className="flex-1">{children}</main>
      <Footer branding={branding} empresa={empresa} />
    </div>
  );
}
