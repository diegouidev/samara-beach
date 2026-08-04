/**
 * Client HTTP do painel interno contra a API Django (DRF).
 * Todas as chamadas são autenticadas (JWT de usuário interno).
 */
import type {
  Categoria,
  ClienteAdmin,
  ConsultaCNPJ,
  ContaPagar,
  DashboardData,
  Devolucao,
  EstoqueBaixoItem,
  Fornecedor,
  ItemDevolvivel,
  ImagemProduto,
  MargemLinha,
  MovimentacaoEstoque,
  NomeRelatorio,
  Paginated,
  Pedido,
  Produto,
  ProdutoResumo,
  ResultadoPeriodo,
  ResumoCaixa,
  ResumoContas,
  SessaoCaixa,
  StatusPedido,
  TipoDevolucao,
  TokenResponse,
  Usuario,
  VariacaoPDV,
  VariacaoProduto,
  VendaPDV,
} from "./types";

/**
 * Base da API:
 * - No browser: NEXT_PUBLIC_API_URL (pode ser "" → mesma origem, via proxy).
 * - No servidor (SSR/Docker): API_URL_INTERNAL (ex.: http://backend:8000).
 */
export const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL_INTERNAL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "sb_admin_access";
const REFRESH_KEY = "sb_admin_refresh";

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface Opts extends RequestInit {
  auth?: boolean;
  /** quando true, não força Content-Type JSON (para FormData/upload) */
  raw?: boolean;
}

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { auth = true, raw = false, headers, ...rest } = opts;
  const finalHeaders: Record<string, string> = {
    ...(raw ? {} : { "Content-Type": "application/json" }),
    ...(headers as Record<string, string>),
  };
  if (auth && tokenStore.access) {
    finalHeaders.Authorization = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    cache: "no-store",
  });

  if (res.status === 204 || res.status === 205) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.detail || JSON.stringify(data))) || res.statusText;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

async function paginateAll<T>(path: string): Promise<T[]> {
  const data = await request<Paginated<T> | T[]>(path);
  return Array.isArray(data) ? data : data.results;
}

// =======================================================================
// Auth
// =======================================================================

export async function login(email: string, senha: string): Promise<TokenResponse> {
  const data = await request<TokenResponse>("/api/auth/token/", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password: senha }),
  });
  tokenStore.set(data.access, data.refresh);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = tokenStore.refresh;
  try {
    if (refresh) {
      await request("/api/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
    }
  } finally {
    tokenStore.clear();
  }
}

export async function getMe(): Promise<Usuario> {
  return request<Usuario>("/api/auth/me/");
}

// =======================================================================
// Catálogo
// =======================================================================

export function listarCategorias() {
  return paginateAll<Categoria>("/api/categorias/?ordering=nome");
}

export function criarCategoria(payload: {
  nome: string;
  slug: string;
  categoria_pai?: string | null;
  ativo?: boolean;
}) {
  return request<Categoria>("/api/categorias/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarCategoria(slug: string, payload: Partial<Categoria>) {
  return request<Categoria>(`/api/categorias/${slug}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Cria/atualiza categoria com upload de imagem (multipart). */
export function criarCategoriaMultipart(form: FormData) {
  return request<Categoria>("/api/categorias/", {
    method: "POST",
    raw: true,
    body: form,
  });
}

export function atualizarCategoriaMultipart(slug: string, form: FormData) {
  return request<Categoria>(`/api/categorias/${slug}/`, {
    method: "PATCH",
    raw: true,
    body: form,
  });
}

export function excluirCategoria(slug: string) {
  return request<void>(`/api/categorias/${slug}/`, { method: "DELETE" });
}

export function listarProdutos(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return paginateAll<ProdutoResumo>(`/api/produtos/${qs ? `?${qs}` : ""}`);
}

export function buscarProduto(slug: string) {
  return request<Produto>(`/api/produtos/${slug}/`);
}

export function criarProduto(payload: Partial<Produto>) {
  return request<Produto>("/api/produtos/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarProduto(slug: string, payload: Partial<Produto>) {
  return request<Produto>(`/api/produtos/${slug}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function excluirProduto(slug: string) {
  return request<void>(`/api/produtos/${slug}/`, { method: "DELETE" });
}

export function criarVariacao(payload: Partial<VariacaoProduto>) {
  return request<VariacaoProduto>("/api/variacoes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarVariacao(id: string, payload: Partial<VariacaoProduto>) {
  return request<VariacaoProduto>(`/api/variacoes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function excluirVariacao(id: string) {
  return request<void>(`/api/variacoes/${id}/`, { method: "DELETE" });
}

/** Upload de imagem de variação (multipart). */
export function enviarImagemVariacao(form: FormData) {
  return request<ImagemProduto>("/api/imagens/", {
    method: "POST",
    raw: true,
    body: form,
  });
}

export function atualizarImagem(id: string, payload: Partial<ImagemProduto>) {
  return request<ImagemProduto>(`/api/imagens/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function excluirImagem(id: string) {
  return request<void>(`/api/imagens/${id}/`, { method: "DELETE" });
}

// =======================================================================
// Estoque
// =======================================================================

export function listarMovimentacoes(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return paginateAll<MovimentacaoEstoque>(
    `/api/movimentacoes/${qs ? `?${qs}` : ""}`,
  );
}

export function criarMovimentacao(payload: {
  variacao: string;
  tipo: string;
  origem: string;
  quantidade: number;
  observacoes?: string;
}) {
  return request<MovimentacaoEstoque>("/api/movimentacoes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function estoqueBaixo() {
  return request<{ count: number; results: EstoqueBaixoItem[] }>(
    "/api/movimentacoes/estoque-baixo/",
  );
}

export async function saldo(variacaoId: string): Promise<number> {
  const r = await request<{ variacao: string; saldo: number }>(
    `/api/movimentacoes/saldo/?variacao=${variacaoId}`,
  );
  return r.saldo;
}

// =======================================================================
// Pedidos
// =======================================================================

export function listarPedidos(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return paginateAll<Pedido>(`/api/pedidos/${qs ? `?${qs}` : ""}`);
}

export function mudarStatusPedido(id: string, status: StatusPedido) {
  return request<Pedido>(`/api/pedidos/${id}/mudar-status/`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// =======================================================================
// Fornecedores
// =======================================================================

export function listarFornecedores() {
  return paginateAll<Fornecedor>("/api/fornecedores/");
}

export function criarFornecedor(payload: Partial<Fornecedor>) {
  return request<Fornecedor>("/api/fornecedores/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarFornecedor(id: string, payload: Partial<Fornecedor>) {
  return request<Fornecedor>(`/api/fornecedores/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function excluirFornecedor(id: string) {
  return request<void>(`/api/fornecedores/${id}/`, { method: "DELETE" });
}

/**
 * Consulta os dados públicos de um CNPJ na Receita (via backend) para
 * preencher o formulário de fornecedor.
 */
export function consultarCNPJ(cnpj: string) {
  const numero = cnpj.replace(/\D/g, "");
  return request<ConsultaCNPJ>(
    `/api/fornecedores/consultar-cnpj/?cnpj=${numero}`,
  );
}

// =======================================================================
// Clientes (somente leitura no painel)
// =======================================================================

export function listarClientes(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return paginateAll<ClienteAdmin>(`/api/clientes/${qs ? `?${qs}` : ""}`);
}

/** Cadastro completo: dados pessoais + endereço principal no mesmo POST. */
export interface ClientePayload {
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string | null;
  observacoes?: string;
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
}

export function criarCliente(payload: ClientePayload) {
  return request<ClienteAdmin>("/api/clientes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarCliente(id: string, payload: Partial<ClientePayload>) {
  return request<ClienteAdmin>(`/api/clientes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Endereço a partir do CEP (BrasilAPI, via backend). */
export function consultarCEP(cep: string) {
  const numero = cep.replace(/\D/g, "");
  return request<{
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
  }>(`/api/clientes/consultar-cep/?cep=${numero}`);
}

// =======================================================================
// PDV / Caixa (loja física)
// =======================================================================

/** Sessão aberta do operador logado (null quando não há caixa aberto). */
export function caixaAtual() {
  return request<{ sessao: SessaoCaixa | null; resumo?: ResumoCaixa }>(
    "/api/caixa/sessoes/atual/",
  );
}

export function abrirCaixa(valor_abertura: string, observacoes = "") {
  return request<SessaoCaixa>("/api/caixa/sessoes/abrir/", {
    method: "POST",
    body: JSON.stringify({ valor_abertura, observacoes }),
  });
}

export function fecharCaixa(
  id: string,
  valor_informado: string,
  observacoes = "",
) {
  return request<ResumoCaixa>(`/api/caixa/sessoes/${id}/fechar/`, {
    method: "POST",
    body: JSON.stringify({ valor_informado, observacoes }),
  });
}

export function movimentarGaveta(
  id: string,
  tipo: "sangria" | "suprimento",
  valor: string,
  motivo: string,
) {
  return request<ResumoCaixa>(`/api/caixa/sessoes/${id}/${tipo}/`, {
    method: "POST",
    body: JSON.stringify({ valor, motivo }),
  });
}

export function resumoCaixa(id: string) {
  return request<ResumoCaixa>(`/api/caixa/sessoes/${id}/resumo/`);
}

export function listarSessoesCaixa() {
  return paginateAll<SessaoCaixa>("/api/caixa/sessoes/");
}

/** Busca por SKU, nome ou cor — já vem com o saldo em estoque. */
export function buscarParaVenda(termo: string) {
  return request<VariacaoPDV[]>(
    `/api/pdv/buscar/?q=${encodeURIComponent(termo)}`,
  );
}

export function registrarVenda(payload: {
  itens: { variacao: string; quantidade: number; preco_unitario?: string }[];
  pagamentos: {
    metodo: string;
    valor: string;
    parcelas?: number;
    valor_recebido?: string | null;
  }[];
  cliente?: string | null;
  desconto_manual?: string;
  observacoes?: string;
  /** Troca: o crédito desta devolução abate o total da venda. */
  devolucao?: string | null;
}) {
  return request<VendaPDV>("/api/pdv/vendas/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function buscarVenda(id: string) {
  return request<VendaPDV>(`/api/pdv/vendas/${id}/`);
}

export function listarVendasPDV() {
  return paginateAll<VendaPDV>("/api/pdv/vendas/");
}

export function cancelarVenda(id: string, motivo: string) {
  return request<VendaPDV>(`/api/pdv/vendas/${id}/cancelar/`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

// =======================================================================
// Trocas e devoluções
// =======================================================================

/** Itens da venda com o quanto ainda pode ser devolvido. */
export function itensDevolviveis(pedidoId: string) {
  return request<ItemDevolvivel[]>(
    `/api/pdv/vendas/${pedidoId}/itens-devolviveis/`,
  );
}

export function registrarDevolucao(payload: {
  pedido: string;
  itens: { item: string; quantidade: number }[];
  tipo: TipoDevolucao;
  motivo: string;
}) {
  return request<Devolucao>("/api/pdv/devolucoes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function buscarDevolucao(id: string) {
  return request<Devolucao>(`/api/pdv/devolucoes/${id}/`);
}

export function listarDevolucoes() {
  return paginateAll<Devolucao>("/api/pdv/devolucoes/");
}

// =======================================================================
// Resultado do período
// =======================================================================

/** Relatórios detalhados: vendas | produtos | clientes | financeiro. */
export function relatorio<T>(nome: NomeRelatorio, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<T>(`/api/relatorios/${nome}/${qs ? `?${qs}` : ""}`);
}

/**
 * Baixa um bloco do relatório em CSV.
 * O fetch precisa carregar o token, por isso o download é feito via blob em
 * vez de um link direto.
 */
export async function baixarRelatorioCSV(
  nome: NomeRelatorio,
  bloco: string,
  params: Record<string, string> = {},
) {
  const qs = new URLSearchParams({ ...params, formato: "csv", bloco }).toString();
  const res = await fetch(`${API_URL}/api/relatorios/${nome}/?${qs}`, {
    headers: tokenStore.access
      ? { Authorization: `Bearer ${tokenStore.access}` }
      : {},
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, "Falha ao gerar o CSV.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nome}-${bloco}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function resultadoPeriodo(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<ResultadoPeriodo>(
    `/api/relatorios/resultado/${qs ? `?${qs}` : ""}`,
  );
}

// =======================================================================
// Perfil do próprio usuário
// =======================================================================

export function atualizarPerfil(payload: {
  first_name?: string;
  last_name?: string;
  email?: string;
}) {
  return request<Usuario>("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function alterarSenha(senha_atual: string, nova_senha: string) {
  return request<{ detail: string }>("/api/auth/alterar-senha/", {
    method: "POST",
    body: JSON.stringify({ senha_atual, nova_senha }),
  });
}

// =======================================================================
// Pedidos de compra a fornecedor
// =======================================================================

export function listarPedidosCompra() {
  return paginateAll<import("./types").PedidoCompra>("/api/pedidos-compra/");
}

export function criarPedidoCompra(payload: {
  fornecedor: string;
  data_prevista?: string | null;
  observacoes?: string;
}) {
  return request<import("./types").PedidoCompra>("/api/pedidos-compra/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarPedidoCompra(
  id: string,
  payload: Partial<import("./types").PedidoCompra>,
) {
  return request<import("./types").PedidoCompra>(`/api/pedidos-compra/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function adicionarItemCompra(payload: {
  pedido_compra: string;
  variacao: string;
  quantidade: number;
  custo_unitario: string;
}) {
  return request<import("./types").ItemPedidoCompra>("/api/itens-compra/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// =======================================================================
// Contas a pagar
// =======================================================================

export function listarContasPagar() {
  return paginateAll<import("./types").ContaPagar>("/api/contas-pagar/");
}

export function criarContaPagar(payload: {
  /** Nulo nas despesas da loja (água, luz, internet…). */
  fornecedor?: string | null;
  categoria?: string;
  descricao?: string;
  valor: string;
  vencimento: string;
  recorrente?: boolean;
  pedido_compra?: string | null;
}) {
  return request<ContaPagar>("/api/contas-pagar/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Baixa a conta. Sendo recorrente, o backend já devolve a do mês seguinte
 * em `proxima` — por isso não se usa PATCH direto no status.
 */
export function pagarConta(id: string, pago_em?: string) {
  return request<{ conta: ContaPagar; proxima: ContaPagar | null }>(
    `/api/contas-pagar/${id}/pagar/`,
    { method: "POST", body: JSON.stringify({ pago_em: pago_em ?? null }) },
  );
}

export function excluirContaPagar(id: string) {
  return request<void>(`/api/contas-pagar/${id}/`, { method: "DELETE" });
}

export function resumoContas(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<ResumoContas>(
    `/api/contas-pagar/resumo/${qs ? `?${qs}` : ""}`,
  );
}

export function atualizarContaPagar(id: string, payload: Partial<ContaPagar>) {
  return request<ContaPagar>(`/api/contas-pagar/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// =======================================================================
// Cupons
// =======================================================================

export function listarCupons() {
  return paginateAll<import("./types").Cupom>("/api/cupons/");
}

export function criarCupom(payload: Partial<import("./types").Cupom>) {
  return request<import("./types").Cupom>("/api/cupons/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarCupom(
  id: string,
  payload: Partial<import("./types").Cupom>,
) {
  return request<import("./types").Cupom>(`/api/cupons/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function excluirCupom(id: string) {
  return request<void>(`/api/cupons/${id}/`, { method: "DELETE" });
}

// =======================================================================
// Avaliações (moderação)
// =======================================================================

export function listarAvaliacoes(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return paginateAll<import("./types").Avaliacao>(
    `/api/avaliacoes/${qs ? `?${qs}` : ""}`,
  );
}

export function moderarAvaliacao(id: string, aprovada: boolean) {
  return request<import("./types").Avaliacao>(`/api/avaliacoes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ aprovada }),
  });
}

export function excluirAvaliacao(id: string) {
  return request<void>(`/api/avaliacoes/${id}/`, { method: "DELETE" });
}

// =======================================================================
// Relatórios
// =======================================================================

export function dashboard(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<DashboardData>(`/api/relatorios/dashboard/${qs ? `?${qs}` : ""}`);
}

export function margem(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ results: MargemLinha[] }>(
    `/api/relatorios/margem/${qs ? `?${qs}` : ""}`,
  );
}
