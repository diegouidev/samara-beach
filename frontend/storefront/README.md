# Samara Beach — Storefront (Next.js)

Loja online (cliente final) de moda praia. Consome a API Django (DRF) do backend.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- zustand (carrinho persistente em localStorage)
- Autenticação JWT contra a API do backend

## Requisitos
- Node.js ≥ 18.18 (recomendado 20 LTS)
- Backend rodando (ver `../../backend`, normalmente em `http://localhost:8000`)

> Neste ambiente WSL1 o Node foi instalado via **nvm** (o npm do Windows não roda sob WSL1).
> Antes de rodar comandos npm: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 20`.

## Rodando
```bash
cp .env.example .env.local     # ajuste NEXT_PUBLIC_API_URL se necessário
npm install
npm run dev                    # http://localhost:3000
```

Variável de ambiente:
- `NEXT_PUBLIC_API_URL` — URL base da API do backend (default `http://localhost:8000`).

## Estrutura
```
app/
  layout.tsx                 # layout raiz (AuthProvider)
  (storefront)/
    layout.tsx               # Header + Footer
    page.tsx                 # HOME (Server Component, ISR)
    produtos/
      page.tsx               # LISTAGEM + filtros
      [slug]/page.tsx        # PÁGINA DE PRODUTO (variações, galeria, tabela)
    carrinho/page.tsx
    checkout/page.tsx        # revisão + placeholder de pagamento/frete
    conta/
      login/page.tsx         # login + registro (JWT)
      pedidos/page.tsx       # histórico + endereços (protegido)
components/                  # UI, layout, produto, filtros, carrinho
lib/
  api.ts                     # client HTTP + JWT + funções da API
  endpoints.ts               # mapa de rotas (bate com o Swagger)
  types.ts                   # tipos espelhando os schemas do backend
  format.ts                  # BRL, resolução de imagem
  mocks.ts                   # fallback para vitrine (API vazia/indisponível)
hooks/useCart.ts             # carrinho zustand + persist
providers/AuthProvider.tsx   # contexto de auth
```

## Decisões de arquitetura
- **SEO/ISR**: home, listagem e produto são Server Components com `revalidate`.
  Interatividade (carrinho, filtros, formulários) fica em Client Components.
- **Carrinho sem login**: itens vivem localmente (zustand+localStorage) e são
  sincronizados com o carrinho do backend no checkout/login
  (`sincronizarCarrinho` em `lib/api.ts`).
- **Fallback mock**: se a API estiver vazia ou fora do ar, a vitrine mostra
  produtos de demonstração (com aviso) para não ficar em branco.
- **Checkout**: pagamento (Pix/cartão) e frete estão em stand-by no backend;
  a página faz a revisão do pedido e registra o pedido, pronta para plugar o
  gateway quando definido.

## Fase 2 (arquitetura aberta, não implementado)
Lista de desejos, avaliações, cupons na UI, newsletter, recomendações.
