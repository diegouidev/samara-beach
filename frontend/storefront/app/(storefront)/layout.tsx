import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getBranding } from "@/lib/branding";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Logo e nome da loja vêm da Personalização (painel) — sem rebuild.
  const branding = await getBranding();

  return (
    <div className="flex min-h-screen flex-col">
      <Header branding={branding} />
      <main className="flex-1">{children}</main>
      <Footer branding={branding} />
    </div>
  );
}
