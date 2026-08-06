/** Tipos espelhando os schemas da API Django (DRF) — visão do painel interno. */

export type PapelInterno = "admin" | "estoque" | "financeiro" | "atendimento";

export interface Usuario {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  /** Nome completo, ou o e-mail quando não há nome. Nunca vazio. */
  nome_exibicao: string;
  cargo: string;
  tipo: "cliente" | "interno";
  papel: PapelInterno | null;
  is_interno: boolean;
  is_cliente: boolean;
}

/** Membro da equipe, na gestão de usuários (Configurações → Usuários). */
export interface UsuarioInterno {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nome_exibicao: string;
  papel: PapelInterno;
  cpf: string;
  telefone: string;
  cargo: string;
  data_admissao: string | null;
  observacoes: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface NovoUsuarioInterno {
  email: string;
  senha: string;
  first_name: string;
  last_name: string;
  papel: PapelInterno;
  cpf?: string;
  telefone?: string;
  cargo?: string;
  data_admissao?: string | null;
  observacoes?: string;
  is_active?: boolean;
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
  categoria_pai_nome: string | null;
  imagem: string | null;
  ordem: number;
  destaque: boolean;
  ativo: boolean;
  total_produtos: number;
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
  produto_nome?: string;
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
  categoria_nome: string;
  tipo_origem: TipoOrigem;
  ativo: boolean;
  imagem_principal: string | null;
  preco_minimo: string | null;
  total_variacoes: number;
  tamanhos: string[];
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

export type CanalVenda = "online" | "presencial";

export interface Pedido {
  id: string;
  cliente: string | null;
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  canal: CanalVenda;
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
  razao_social: string;
  nome_fantasia: string;
  contato_nome: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  prazo_medio_entrega_dias: number | null;
  observacoes: string;
  ativo: boolean;
}

/** Retorno de /api/fornecedores/consultar-cnpj/ (dados da Receita). */
export interface ConsultaCNPJ {
  cnpj: string;
  nome: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  situacao_cadastral: string;
  atividade_principal: string;
}

// --- Clientes ---

export interface EnderecoCliente {
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

export interface ClienteAdmin {
  id: string;
  email: string;
  nome: string;
  cpf: string;
  telefone: string;
  data_nascimento: string | null;
  observacoes: string;
  enderecos: EnderecoCliente[];
  total_pedidos: number;
  total_gasto: string | null;
  created_at: string;
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

export type CategoriaDespesa =
  | "mercadoria"
  | "aluguel"
  | "energia"
  | "agua"
  | "telecom"
  | "impostos"
  | "salarios"
  | "marketing"
  | "manutencao"
  | "outros";

/** Categorias na ordem em que aparecem no formulário. */
export const CATEGORIAS_DESPESA: {
  valor: CategoriaDespesa;
  label: string;
}[] = [
  { valor: "mercadoria", label: "Mercadoria / fornecedor" },
  { valor: "aluguel", label: "Aluguel" },
  { valor: "energia", label: "Energia elétrica" },
  { valor: "agua", label: "Água" },
  { valor: "telecom", label: "Internet e telefone" },
  { valor: "impostos", label: "Impostos e taxas" },
  { valor: "salarios", label: "Salários e encargos" },
  { valor: "marketing", label: "Marketing" },
  { valor: "manutencao", label: "Manutenção" },
  { valor: "outros", label: "Outros" },
];

export interface ContaPagar {
  id: string;
  fornecedor: string | null;
  fornecedor_nome: string;
  pedido_compra: string | null;
  categoria: CategoriaDespesa;
  categoria_label: string;
  /** Descrição, ou nome do fornecedor, ou a categoria — o que houver. */
  titulo: string;
  descricao: string;
  valor: string;
  vencimento: string;
  pago_em: string | null;
  status: StatusContaPagar;
  /** Considera a data de hoje: uma conta aberta e atrasada vem "vencida". */
  status_efetivo: StatusContaPagar;
  recorrente: boolean;
  conta_origem: string | null;
}

export interface ResumoContas {
  total_aberto: string;
  total_vencido: string;
  total_pago: string;
  num_vencidas: number;
  por_categoria: { categoria: CategoriaDespesa; total: string }[];
}

export interface ResultadoPeriodo {
  periodo: { inicio: string | null; fim: string | null };
  receita_bruta: string;
  devolucoes: string;
  receita_liquida: string;
  custo_produtos: string;
  lucro_bruto: string;
  despesas: string;
  resultado: string;
  margem_percentual: string;
  por_canal: Record<CanalVenda, TotaisCanal>;
  despesas_por_categoria: { categoria: CategoriaDespesa; total: string }[];
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

// --- PDV / Caixa (loja física) ---

export type MetodoPagamento =
  | "dinheiro"
  | "debito"
  | "credito"
  | "pix"
  | "cartao"
  | "boleto";

/** Formas aceitas no balcão, na ordem em que aparecem na tela. */
export const METODOS_PDV: { valor: MetodoPagamento; label: string }[] = [
  { valor: "dinheiro", label: "Dinheiro" },
  { valor: "debito", label: "Débito" },
  { valor: "credito", label: "Crédito" },
  { valor: "pix", label: "PIX" },
];

export interface SessaoCaixa {
  id: string;
  operador: string;
  operador_nome: string;
  status: "aberta" | "fechada";
  aberta_em: string;
  fechada_em: string | null;
  valor_abertura: string;
  valor_fechamento_informado: string | null;
  valor_fechamento_esperado: string | null;
  diferenca: string | null;
  observacoes_abertura: string;
  observacoes_fechamento: string;
}

export type TipoMovimentoCaixa =
  | "abertura"
  | "venda"
  | "sangria"
  | "suprimento"
  | "devolucao";

export interface MovimentoCaixa {
  id: string;
  tipo: TipoMovimentoCaixa;
  metodo_pagamento: string;
  valor: string;
  pedido: string | null;
  motivo: string;
  usuario_nome: string;
  created_at: string;
}

export interface ResumoCaixa {
  sessao: SessaoCaixa;
  total_vendido: string;
  num_vendas: number;
  ticket_medio: string;
  total_sangrias: string;
  total_suprimentos: string;
  total_devolucoes: string;
  dinheiro_esperado: string;
  por_metodo: Record<string, string>;
  movimentos: MovimentoCaixa[];
}

/** Resultado da busca do PDV: SKU com preço, saldo e foto. */
export interface VariacaoPDV {
  id: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  preco: string;
  saldo: number;
  imagem: string | null;
}

export interface PagamentoVenda {
  metodo: MetodoPagamento;
  valor: string;
  parcelas: number;
  valor_recebido: string | null;
  troco: string | null;
}

export interface VendaPDV extends Pedido {
  pagamentos: PagamentoVenda[];
  vendedor_nome: string;
  cliente_nome: string;
  desconto_manual: string;
}

// --- Trocas e devoluções ---

export type TipoDevolucao = "devolucao" | "troca";

/** Item da venda com o saldo ainda passível de devolução. */
export interface ItemDevolvivel {
  id: string;
  sku: string;
  produto_nome: string;
  quantidade: number;
  devolvida: number;
  disponivel: number;
  preco_unitario: string;
}

export interface ItemDevolvido {
  id: string;
  item_pedido: string;
  sku: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: string;
  subtotal: string;
}

export interface Devolucao {
  id: string;
  pedido_origem: string;
  pedido_troca: string | null;
  tipo: TipoDevolucao;
  motivo: string;
  valor_total: string;
  credito_usado: string;
  credito_disponivel: string;
  itens: ItemDevolvido[];
  operador_nome: string;
  created_at: string;
}

// --- Relatórios ---

export interface TotaisCanal {
  num_pedidos: number;
  faturamento: number;
  ticket_medio: number;
}

export interface DashboardData {
  periodo: { inicio: string | null; fim: string | null };
  num_pedidos: number;
  faturamento: number;
  ticket_medio: number;
  por_canal: Record<CanalVenda, TotaisCanal>;
  produtos_mais_vendidos: {
    sku: string;
    produto: string;
    quantidade: number;
    receita: string;
  }[];
}

// --- Módulo de relatórios ---

export type NomeRelatorio = "vendas" | "produtos" | "clientes" | "financeiro";

export interface RelatorioVendas {
  total_pedidos: number;
  total_vendido: string;
  pecas_vendidas: number;
  ticket_medio: string;
  pecas_por_venda: string;
  por_dia: { data: string; pedidos: number; total: string }[];
  por_canal: { canal: CanalVenda; pedidos: number; total: string }[];
  por_vendedor: {
    vendedor: string;
    pedidos: number;
    total: string;
    ticket_medio: string;
  }[];
  por_pagamento: { metodo: string; transacoes: number; total: string }[];
}

export interface RelatorioProdutos {
  receita_total: string;
  skus_vendidos: number;
  unidades_em_estoque: number;
  valor_em_estoque: string;
  valor_parado: string;
  ranking: {
    sku: string;
    produto: string;
    tipo_origem: TipoOrigem;
    unidades: number;
    receita: string;
    custo: string;
    margem: string;
    margem_percentual: string;
    participacao: string;
    curva: "A" | "B" | "C";
    custo_incompleto: boolean;
  }[];
  parados: {
    sku: string;
    produto: string;
    saldo: number;
    custo_medio: string;
    valor_parado: string;
  }[];
}

export interface RelatorioClientes {
  clientes_compraram: number;
  clientes_novos: number;
  clientes_recorrentes: number;
  vendas_identificadas: number;
  vendas_anonimas: number;
  ranking: {
    cliente: string;
    contato: string;
    compras: number;
    gasto: string;
    ticket_medio: string;
    ultima_compra: string | null;
  }[];
}

export interface RelatorioFinanceiro {
  total_entradas: string;
  total_saidas: string;
  turnos_fechados: number;
  diferenca_acumulada: string;
  total_devolvido: string;
  contas_a_vencer: string;
  fluxo: {
    data: string;
    entradas: string;
    saidas: string;
    liquido: string;
  }[];
  turnos: {
    operador: string;
    abertura: string;
    fechamento: string | null;
    status: string;
    valor_abertura: string;
    esperado: string | null;
    contado: string | null;
    diferenca: string | null;
  }[];
  a_vencer: {
    conta: string;
    categoria: string;
    vencimento: string;
    valor: string;
    situacao: string;
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
