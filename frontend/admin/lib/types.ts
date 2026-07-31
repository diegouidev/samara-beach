/** Tipos espelhando os schemas da API Django (DRF) — visão do painel interno. */

export type PapelInterno = "admin" | "estoque" | "financeiro" | "atendimento";

export interface Usuario {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tipo: "cliente" | "interno";
  papel: PapelInterno | null;
  is_interno: boolean;
  is_cliente: boolean;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  user: Usuario;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Catálogo ---

export type TipoOrigem = "producao_propria" | "revenda";

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  categoria_pai: string | null;
  ativo: boolean;
}

export interface ImagemProduto {
  id: string;
  variacao: string;
  imagem: string | null;
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
  custo_medio: string | null;
  estoque_minimo: number;
  ativo: boolean;
  imagens: ImagemProduto[];
}

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

export interface ProdutoResumo {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  tipo_origem: TipoOrigem;
  ativo: boolean;
}

// --- Estoque ---

export interface MovimentacaoEstoque {
  id: string;
  variacao: string;
  tipo: "entrada" | "saida" | "ajuste";
  origem: "venda" | "producao" | "compra" | "devolucao" | "ajuste";
  quantidade: number;
  saldo_resultante: number;
  observacoes: string;
  created_at: string;
}

export interface EstoqueBaixoItem {
  variacao: string;
  sku: string;
  produto: string;
  saldo: number;
  estoque_minimo: number;
}

// --- Pedidos ---

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
  cupom_codigo: string | null;
  subtotal: string;
  frete: string;
  desconto: string;
  total: string;
  itens: ItemPedido[];
  created_at: string;
  updated_at: string;
}

// --- Fornecedores ---

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato_nome: string;
  email: string;
  telefone: string;
  prazo_medio_entrega_dias: number | null;
  observacoes: string;
  ativo: boolean;
}

// --- Compras / Financeiro ---

export type StatusPedidoCompra =
  | "rascunho"
  | "enviado"
  | "confirmado"
  | "recebido"
  | "cancelado";

export interface ItemPedidoCompra {
  id: string;
  pedido_compra: string;
  variacao: string;
  quantidade: number;
  custo_unitario: string;
  subtotal: string;
}

export interface PedidoCompra {
  id: string;
  fornecedor: string;
  status: StatusPedidoCompra;
  data_prevista: string | null;
  custo_total: string;
  observacoes: string;
  itens: ItemPedidoCompra[];
  created_at: string;
}

export type StatusContaPagar = "aberta" | "paga" | "vencida" | "cancelada";

export interface ContaPagar {
  id: string;
  fornecedor: string;
  pedido_compra: string | null;
  descricao: string;
  valor: string;
  vencimento: string;
  pago_em: string | null;
  status: StatusContaPagar;
}

// --- Cupons ---

export interface Cupom {
  id: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: string;
  validade: string | null;
  uso_maximo: number | null;
  usos: number;
  ativo: boolean;
}

// --- Avaliações (moderação) ---

export interface Avaliacao {
  id: string;
  produto: string;
  cliente: string | null;
  nota: number;
  comentario: string;
  aprovada: boolean;
  created_at: string;
}

// --- Relatórios ---

export interface DashboardData {
  periodo: { inicio: string | null; fim: string | null };
  num_pedidos: number;
  faturamento: number;
  ticket_medio: number;
  produtos_mais_vendidos: {
    sku: string;
    produto: string;
    quantidade: number;
    receita: string;
  }[];
}

export interface MargemLinha {
  produto_id: string;
  produto: string;
  tipo_origem: TipoOrigem;
  unidades: number;
  receita: string;
  custo: string;
  margem: string;
  margem_percentual: string;
  custo_incompleto: boolean;
}
