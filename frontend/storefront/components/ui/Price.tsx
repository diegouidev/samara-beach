import { formatBRL } from "@/lib/format";

export function Price({
  preco,
  promocional,
  className = "",
}: {
  preco: string | number;
  promocional?: string | number | null;
  className?: string;
}) {
  const temPromo =
    promocional !== null &&
    promocional !== undefined &&
    Number(promocional) > 0 &&
    Number(promocional) < Number(preco);

  if (temPromo) {
    return (
      <span className={`flex items-baseline gap-2 ${className}`}>
        <span className="text-sm text-gray-400 line-through">
          {formatBRL(preco)}
        </span>
        <span className="font-semibold text-brand-coral">
          {formatBRL(promocional!)}
        </span>
      </span>
    );
  }
  return (
    <span className={`font-semibold text-brand-ink ${className}`}>
      {formatBRL(preco)}
    </span>
  );
}
