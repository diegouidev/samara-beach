/**
 * Mapa central dos endpoints da API Django (DRF), confirmados no Swagger.
 * Mantê-los aqui evita strings de URL espalhadas pelo código.
 */
export const ENDPOINTS = {
  // Auth
  token: "/api/auth/token/",
  tokenRefresh: "/api/auth/token/refresh/",
  logout: "/api/auth/logout/",
  me: "/api/auth/me/",

  // Clientes
  registro: "/api/clientes/registro/",
  clienteEu: "/api/clientes/eu/",
  enderecos: "/api/enderecos/",

  // Catálogo
  produtos: "/api/produtos/",
  produto: (slug: string) => `/api/produtos/${slug}/`,
  categorias: "/api/categorias/",
  variacoes: "/api/variacoes/",
  tabelasMedidas: "/api/tabelas-medidas/",
  avaliacoes: "/api/avaliacoes/",

  // Pedidos / carrinho
  pedidos: "/api/pedidos/",
  carrinho: "/api/pedidos/carrinho/",
  pedidoItens: (id: string) => `/api/pedidos/${id}/itens/`,
  pedidoItem: (id: string, itemId: string) =>
    `/api/pedidos/${id}/itens/${itemId}/`,
  pedidoAplicarCupom: (id: string) => `/api/pedidos/${id}/aplicar-cupom/`,
} as const;
