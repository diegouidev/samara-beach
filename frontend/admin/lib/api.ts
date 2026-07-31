/**
 * Client HTTP do painel interno contra a API Django (DRF).
 * Todas as chamadas são autenticadas (JWT de usuário interno).
 */
import type {
  Categoria,
  DashboardData,
  EstoqueBaixoItem,
  Fornecedor,
  ImagemProduto,
  MargemLinha,
  MovimentacaoEstoque,
  Paginated,
  Pedido,
  Produto,
  ProdutoResumo,
  StatusPedido,
  TokenResponse,
  Usuario,
  VariacaoProduto,
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
  return paginateAll<Categoria>("/api/categorias/");
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

/** Upload de imagem de variação (multipart). */
export function enviarImagemVariacao(form: FormData) {
  return request<ImagemProduto>("/api/imagens/", {
    method: "POST",
    raw: true,
    body: form,
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
  fornecedor: string;
  descricao?: string;
  valor: string;
  vencimento: string;
  pedido_compra?: string | null;
}) {
  return request<import("./types").ContaPagar>("/api/contas-pagar/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarContaPagar(
  id: string,
  payload: Partial<import("./types").ContaPagar>,
) {
  return request<import("./types").ContaPagar>(`/api/contas-pagar/${id}/`, {
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
