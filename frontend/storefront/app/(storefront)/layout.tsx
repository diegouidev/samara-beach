import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getBranding } from "@/lib/branding";
import { getEmpresa } from "@/lib/empresa";
import { listarCategorias } from "@/lib/api";
import { PaginaInstitucional } from "@/components/institucional/PaginaInstitucional";
import { lojaOnlineAtiva } from "@/lib/loja-online";

/**
 * A leitura sem cache do kill switch torna todas as rotas da loja dinâmicas
 * (renderizadas a cada requisição, sem ISR). É o preço de poder desligar a
 * loja na hora, e cabe bem no volume desta loja — os dados pesados
 * (catálogo, branding) continuam cacheados por `revalidate` nos seus fetches.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, lojaLigada] = await Promise.all([
    getBranding(),
    // Sem cache: o kill switch precisa valer na hora, não na próxima janela
    // de ISR. O branding em si continua cacheado.
    lojaOnlineAtiva(),
  ]);

  // Kill switch (LOJA_ONLINE_ATIVA no backend/.env): a loja inteira vira uma
  // página institucional.
  if (!lojaLigada) {
    const empresa = await getEmpresa();
    return <PaginaInstitucional branding={branding} empresa={empresa} />;
  }

  // Logo, menu e dados da empresa vêm do painel — sem rebuild.
  const [categorias, empresa] = await Promise.all([
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
