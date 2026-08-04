/**
 * Client HTTP para a API Django (DRF).
 *
 * - Server Components: usam `apiGet` com revalidação (ISR) para SEO.
 * - Client Components: usam `apiFetch` com token JWT (lido do localStorage).
 *
 * Os decimais da API chegam como string; a conversão para número fica nas views.
 */
import { ENDPOINTS } from "./endpoints";
import { resolveImagem } from "./format";
import { MOCK_PRODUTOS } from "./mocks";
import type {
  Cliente,
  Endereco,
  Paginated,
  Pedido,
  Produto,
  ProdutoResumo,
  TokenResponse,
  Usuario,
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

const TOKEN_KEY = "sb_access";
const REFRESH_KEY = "sb_refresh";

// --- Gestão de token (client-side) --------------------------------------

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

// --- Fetch base ---------------------------------------------------------

interface FetchOpts extends RequestInit {
  /** segundos de revalidação (ISR) para Server Components */
  revalidate?: number;
  /** anexa o token JWT (default: true no client) */
  auth?: boolean;
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { revalidate, auth = true, headers, ...rest } = opts;
  const url = `${API_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth && typeof window !== "undefined" && tokenStore.access) {
    finalHeaders.Authorization = `Bearer ${tokenStore.access}`;
  }

  const nextConfig =
    typeof revalidate === "number" ? { next: { revalidate } } : {};

  // No servidor (SSR/build), aborta rápido se a API não responder — evita travar o prerender.
  const signal =
    typeof window === "undefined" ? AbortSignal.timeout(4000) : undefined;

  const res = await fetch(url, {
    ...rest,
    signal,
    headers: finalHeaders,
    ...nextConfig,
  });

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg =
      (data && (data.detail || JSON.stringify(data))) || res.statusText;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

/** GET para Server Components (ISR). */
export function apiGet<T>(path: string, revalidate = 60): Promise<T> {
  return request<T>(path, { method: "GET", auth: false, revalidate });
}

/** Fetch autenticado para Client Components. */
export function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  return request<T>(path, opts);
}

// =======================================================================
// Catálogo (Server Components — ISR)
// =======================================================================

export interface FiltrosProduto {
  categoria?: string; // id da categoria
  search?: string;
  ordering?: string; // ex: "nome", "-created_at"
  page?: number;
  // Filtros por variação (aplicados no backend — ver catalog.filters.ProdutoFilter).
  cor?: string;
  tamanho?: string;
  preco_min?: string | number;
  preco_max?: string | number;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Lista produtos com filtros de API (categoria/busca/ordenação).
 * Se a API estiver vazia ou indisponível, cai no mock para a vitrine não ficar vazia.
 */
export async function listarProdutos(
  filtros: FiltrosProduto = {},
): Promise<{ produtos: ProdutoResumo[]; count: number; usouMock: boolean }> {
  const qs = buildQuery({ ...filtros });
  try {
    const data = await apiGet<Paginated<ProdutoResumo>>(
      `${ENDPOINTS.produtos}${qs}`,
      60,
    );
    if (data.count === 0) {
      return {
        produtos: MOCK_PRODUTOS.map(toResumo),
        count: MOCK_PRODUTOS.length,
        usouMock: true,
      };
    }
    return { produtos: data.results, count: data.count, usouMock: false };
  } catch {
    return {
      produtos: MOCK_PRODUTOS.map(toResumo),
      count: MOCK_PRODUTOS.length,
      usouMock: true,
    };
  }
}

/** Detalhe de produto por slug (com variações). Fallback para mock. */
export async function buscarProdutoPorSlug(
  slug: string,
): Promise<{ produto: Produto | null; usouMock: boolean }> {
  try {
    const produto = await apiGet<Produto>(ENDPOINTS.produto(slug), 60);
    return { produto, usouMock: false };
  } catch (err) {
    const mock = MOCK_PRODUTOS.find((p) => p.slug === slug) ?? null;
    if (mock) return { produto: mock, usouMock: true };
    if (err instanceof ApiError && err.status === 404) {
      return { produto: null, usouMock: false };
    }
    return { produto: null, usouMock: true };
  }
}

/**
 * Lista produtos já com dados de card (capa + preço da variação em destaque).
 * Os campos vêm prontos do serializer de listagem — um request só, sem N+1.
 * Os filtros cor/tamanho/preço são aplicados no backend (catalog.filters).
 */
export async function listarProdutosParaVitrine(
  filtros: FiltrosProduto = {},
): Promise<{
  cards: import("@/components/produto/ProductCard").ProductCardData[];
  usouMock: boolean;
}> {
  const { produtos, usouMock } = await listarProdutos(filtros);

  const cards = produtos.map((p) => ({
    slug: p.slug,
    nome: p.nome,
    imagem: resolveImagem(p.imagem_principal),
    preco: p.preco_original ?? p.preco_minimo,
    promocional: p.preco_promocional,
    tipoOrigem: p.tipo_origem,
    tamanhos: p.tamanhos,
    totalVariacoes: p.total_variacoes,
    variacaoId: p.variacao_destaque?.id ?? null,
    sku: p.variacao_destaque?.sku,
    cor: p.variacao_destaque?.cor,
    tamanho: p.variacao_destaque?.tamanho,
  }));

  return { cards, usouMock };
}

export async function listarCategorias() {
  try {
    const data = await apiGet<Paginated<import("./types").Categoria>>(
      ENDPOINTS.categorias,
      300,
    );
    return data.results;
  } catch {
    return [];
  }
}

function toResumo(p: Produto): ProdutoResumo {
  const variacao = p.variacoes.find((v) => v.ativo) ?? p.variacoes[0];
  const imagem = variacao?.imagens?.[0];
  return {
    id: p.id,
    nome: p.nome,
    slug: p.slug,
    categoria: p.categoria,
    categoria_nome: "",
    tipo_origem: p.tipo_origem,
    ativo: p.ativo,
    imagem_principal: imagem?.url_externa || imagem?.imagem || null,
    preco_minimo: variacao?.preco_vigente ?? null,
    preco_original: variacao?.preco ?? null,
    preco_promocional: variacao?.preco_promocional ?? null,
    total_variacoes: p.variacoes.length,
    tamanhos: Array.from(
      new Set(p.variacoes.map((v) => v.tamanho).filter(Boolean)),
    ).sort(),
    variacao_destaque: variacao
      ? {
          id: variacao.id,
          sku: variacao.sku,
          cor: variacao.cor,
          tamanho: variacao.tamanho,
        }
      : null,
  };
}

// =======================================================================
// Auth / Cliente (Client Components)
// =======================================================================

export async function login(
  email: string,
  senha: string,
): Promise<TokenResponse> {
  const data = await request<TokenResponse>(ENDPOINTS.token, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password: senha }),
  });
  tokenStore.set(data.access, data.refresh);
  return data;
}

export async function registrar(payload: {
  email: string;
  password: string;
  nome: string;
  cpf?: string;
  telefone?: string;
}): Promise<Cliente> {
  return request<Cliente>(ENDPOINTS.registro, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  const refresh = tokenStore.refresh;
  try {
    if (refresh) {
      await apiFetch(ENDPOINTS.logout, {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
    }
  } finally {
    tokenStore.clear();
  }
}

export async function getMe(): Promise<Usuario> {
  return apiFetch<Usuario>(ENDPOINTS.me, { method: "GET" });
}

export async function getMeuPerfil(): Promise<Cliente> {
  return apiFetch<Cliente>(ENDPOINTS.clienteEu, { method: "GET" });
}

export async function listarEnderecos(): Promise<Endereco[]> {
  const data = await apiFetch<Paginated<Endereco> | Endereco[]>(
    ENDPOINTS.enderecos,
    { method: "GET" },
  );
  return Array.isArray(data) ? data : data.results;
}

export type NovoEndereco = Omit<Endereco, "id">;

export async function criarEndereco(payload: NovoEndereco): Promise<Endereco> {
  return apiFetch<Endereco>(ENDPOINTS.enderecos, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function excluirEndereco(id: string): Promise<void> {
  await apiFetch<void>(`${ENDPOINTS.enderecos}${id}/`, { method: "DELETE" });
}

// =======================================================================
// Carrinho / Pedidos (Client Components — exige login no backend)
// =======================================================================

export async function obterCarrinho(): Promise<Pedido> {
  return apiFetch<Pedido>(ENDPOINTS.carrinho, { method: "POST" });
}

export async function adicionarItem(
  pedidoId: string,
  variacaoId: string,
  quantidade: number,
): Promise<Pedido> {
  return apiFetch<Pedido>(ENDPOINTS.pedidoItens(pedidoId), {
    method: "POST",
    body: JSON.stringify({ variacao: variacaoId, quantidade }),
  });
}

export async function removerItem(
  pedidoId: string,
  itemId: string,
): Promise<Pedido> {
  return apiFetch<Pedido>(ENDPOINTS.pedidoItem(pedidoId, itemId), {
    method: "DELETE",
  });
}

export async function aplicarCupom(
  pedidoId: string,
  codigo: string,
): Promise<Pedido> {
  return apiFetch<Pedido>(ENDPOINTS.pedidoAplicarCupom(pedidoId), {
    method: "POST",
    body: JSON.stringify({ codigo }),
  });
}

// =======================================================================
// Avaliações (Fase 2)
// =======================================================================

export async function listarAvaliacoes(
  produtoId: string,
): Promise<import("./types").Avaliacao[]> {
  try {
    const data = await apiGet<Paginated<import("./types").Avaliacao>>(
      `${ENDPOINTS.avaliacoes}?produto=${produtoId}`,
      30,
    );
    return data.results;
  } catch {
    return [];
  }
}

export async function criarAvaliacao(payload: {
  produto: string;
  nota: number;
  comentario: string;
}): Promise<import("./types").Avaliacao> {
  return apiFetch<import("./types").Avaliacao>(ENDPOINTS.avaliacoes, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listarPedidos(): Promise<Pedido[]> {
  const data = await apiFetch<Paginated<Pedido> | Pedido[]>(ENDPOINTS.pedidos, {
    method: "GET",
  });
  return Array.isArray(data) ? data : data.results;
}

/**
 * Sincroniza o carrinho local (visitante) com o carrinho do backend após login.
 * Cria/pega o carrinho e adiciona cada linha local.
 */
export async function sincronizarCarrinho(
  linhas: { variacaoId: string; quantidade: number }[],
): Promise<Pedido> {
  const carrinho = await obterCarrinho();
  let atual = carrinho;
  for (const linha of linhas) {
    atual = await adicionarItem(atual.id, linha.variacaoId, linha.quantidade);
  }
  return atual;
}

/**
 * Fecha o carrinho: o pedido passa a aguardar pagamento e ganha um número.
 * A negociação de entrega e pagamento segue no WhatsApp da loja.
 */
export function finalizarPedido(pedidoId: string): Promise<Pedido> {
  return apiFetch<Pedido>(`/api/pedidos/${pedidoId}/finalizar/`, {
    method: "POST",
  });
}
