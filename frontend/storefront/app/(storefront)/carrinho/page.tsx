import { CartView } from "@/components/carrinho/CartView";

export const metadata = { title: "Carrinho" };

export default function CarrinhoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-ink">Seu carrinho</h1>
      <CartView />
    </div>
  );
}
