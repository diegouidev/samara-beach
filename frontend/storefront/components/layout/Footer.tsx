export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-100 bg-brand-sand">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-600">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div>
            <p className="text-lg font-bold">
              Samara <span className="text-brand-sea">Beach</span>
            </p>
            <p className="mt-2 max-w-xs text-gray-500">
              Moda praia com produção própria e curadoria. Biquínis, maiôs,
              saídas e acessórios.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="font-semibold text-brand-ink">Loja</p>
              <ul className="mt-2 space-y-1 text-gray-500">
                <li>Produtos</li>
                <li>Novidades</li>
                <li>Promoções</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-brand-ink">Ajuda</p>
              <ul className="mt-2 space-y-1 text-gray-500">
                <li>Trocas e devoluções</li>
                <li>Tabela de medidas</li>
                <li>Contato</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          © {new Date().getFullYear()} Samara Beach. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
