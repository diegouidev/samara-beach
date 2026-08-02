import { Sidebar } from "@/components/layout/Sidebar";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-panel-bg">
      <Sidebar />
      {/* min-w-0 impede que uma tabela larga estoure o layout flex. */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <RequireAuth>{children}</RequireAuth>
        </div>
      </main>
    </div>
  );
}
