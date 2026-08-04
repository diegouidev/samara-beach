import { PainelShell } from "@/components/layout/PainelShell";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PainelShell>
      <RequireAuth>{children}</RequireAuth>
    </PainelShell>
  );
}
