import type { TabelaMedidas } from "@/lib/types";

/**
 * Renderiza a tabela de medidas. `dados` tem formato livre:
 * { "P": { "busto": "80-84", ... }, "M": { ... } }
 */
export function SizeTable({ tabela }: { tabela: TabelaMedidas }) {
  const linhas = Object.entries(tabela.dados ?? {});
  if (linhas.length === 0) return null;

  const colunas = [...new Set(linhas.flatMap(([, medidas]) => Object.keys(medidas)))];

  return (
    <div className="mt-8">
      <p className="mb-2 text-sm font-semibold text-brand-ink">
        {tabela.nome || "Tabela de medidas"}
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-brand-sand text-brand-ink">
            <tr>
              <th className="px-3 py-2 text-left">Tamanho</th>
              {colunas.map((c) => (
                <th key={c} className="px-3 py-2 text-left capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(([tam, medidas]) => (
              <tr key={tam} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{tam}</td>
                {colunas.map((c) => (
                  <td key={c} className="px-3 py-2 text-gray-600">
                    {medidas[c] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
