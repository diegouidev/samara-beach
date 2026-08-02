/**
 * Tipos que espelham os schemas da API Django (DRF).
 * Fonte: /api/schema/ (drf-spectacular). Valores decimais chegam como string.
 */

export type TipoOrigem = "producao_propria" | "revenda";

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  categoria_pai: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ImagemProduto {
  id: string;
  variacao: string;
  imagem: string | null; // caminho relativo em /media/ ou null
  url_externa: string | null;
  alt_text: string;
  ordem: number;
}

export interface VariacaoProduto {
  id: string;
  produto: string;
  cor: string;
  tamanho: string;
  sku: string;
  preco: string;
  preco_promocional: string | null;
  preco_vigente: string;
  peso_gramas: number | null;
  altura_cm: string | null;
  largura_cm: string | null;
  profundidade_cm: string | null;
  ativo: boolean;
  imagens: ImagemProduto[];
}

/** Produto no detalhe (com variações aninhadas). */
export interface Produto {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  categoria: string;
  tipo_origem: TipoOrigem;
  tags: string[];
  ativo: boolean;
  variacoes: VariacaoProduto[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Produto na listagem: sem as variações completas, mas já com o resumo que a
 * vitrine precisa (capa, faixa de preço e tamanhos) — evita um request por card.
 */
export interface ProdutoResumo {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  categoria_nome: string;
  tipo_origem: TipoOrigem;
  ativo: boolean;
  imagem_principal: string | null;
  /** Preço em exibição (já considera promoção). */
  preco_minimo: string | null;
  /** Preço cheio da mesma variação — usado para o "de/por". */
  preco_original: string | null;
  preco_promocional: string | null;
  total_variacoes: number;
  tamanhos: string[];
  /** SKU exibido no card — permite comprar sem abrir o produto. */
  variacao_destaque: {
    id: string;
    sku: string;
    cor: string;
    tamanho: string;
  } | null;
}

export interface TabelaMedidas {
  id: string;
  nome: string;
  categoria: string | null;
  produto: string | null;
  dados: Record<string, Record<string, string>>;
}

/** Resposta paginada padrão do DRF (PageNumberPagination). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Auth / Cliente ---

export interface Usuario {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tipo: "cliente" | "interno";
  papel: string | null;
  is_interno: boolean;
  is_cliente: boolean;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  user: Usuario;
}

export interface Endereco {
  id: string;
  tipo: "entrega" | "cobranca";
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  principal: boolean;
}

export interface Cliente {
  id: string;
  email: string;
  nome: string;
  cpf: string;
  telefone: string;
  enderecos: Endereco[];
  created_at?: string;
}

// --- Pedidos (backend) ---

export type StatusPedido =
  | "carrinho"
  | "aguardando_pagamento"
  | "pago"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export interface ItemPedido {
  id: string;
  pedido: string;
  variacao: string;
  sku: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: string;
  subtotal: string;
}

export interface Pedido {
  id: string;
  cliente: string;
  status: StatusPedido;
  cupom: string | null;
  cupom_codigo: string | null;
  endereco_entrega: string | null;
  subtotal: string;
  frete: string;
  desconto: string;
  total: string;
  itens: ItemPedido[];
  created_at: string;
  updated_at: string;
}

// --- Avaliações (Fase 2) ---

export interface Avaliacao {
  id: string;
  produto: string;
  cliente: string | null;
  nota: number;
  comentario: string;
  aprovada: boolean;
  created_at: string;
}

// --- Carrinho local (visitante, antes de logar) ---

export interface LinhaCarrinho {
  variacaoId: string;
  produtoSlug: string;
  produtoNome: string;
  sku: string;
  cor: string;
  tamanho: string;
  precoUnitario: number;
  imagem: string | null;
  quantidade: number;
}
