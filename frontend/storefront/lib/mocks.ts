/**
 * Dados mock de fallback — usados apenas quando a API está vazia ou indisponível,
 * para a vitrine não ficar vazia em demos. Não substituem a API real.
 */
import type { Produto } from "./types";

const IMG = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=800&q=70`;

export const MOCK_PRODUTOS: Produto[] = [
  {
    id: "mock-1",
    nome: "Biquíni Ipanema",
    slug: "biquini-ipanema",
    descricao:
      "Biquíni de cintura alta com amarração ajustável. Produção própria, tecido com proteção UV.",
    categoria: "mock-cat-biquinis",
    tipo_origem: "producao_propria",
    tags: ["biquíni", "verão"],
    ativo: true,
    variacoes: [
      {
        id: "mock-1-v1",
        produto: "mock-1",
        cor: "Azul",
        tamanho: "M",
        sku: "BIK-IPA-AZ-M",
        preco: "199.90",
        preco_promocional: null,
        preco_vigente: "199.90",
        peso_gramas: 120,
        altura_cm: null,
        largura_cm: null,
        profundidade_cm: null,
        ativo: true,
        imagens: [
          {
            id: "mock-1-img1",
            variacao: "mock-1-v1",
            imagem: null,
            url_externa: IMG("photo-1520975954732-35dd22299614"),
            alt_text: "Biquíni Ipanema Azul",
            ordem: 0,
          },
        ],
      },
      {
        id: "mock-1-v2",
        produto: "mock-1",
        cor: "Coral",
        tamanho: "P",
        sku: "BIK-IPA-CO-P",
        preco: "199.90",
        preco_promocional: "169.90",
        preco_vigente: "169.90",
        peso_gramas: 110,
        altura_cm: null,
        largura_cm: null,
        profundidade_cm: null,
        ativo: true,
        imagens: [
          {
            id: "mock-1-img2",
            variacao: "mock-1-v2",
            imagem: null,
            url_externa: IMG("photo-1570976447640-ac859083963f"),
            alt_text: "Biquíni Ipanema Coral",
            ordem: 0,
          },
        ],
      },
    ],
  },
  {
    id: "mock-2",
    nome: "Saída Boho",
    slug: "saida-boho",
    descricao:
      "Saída de praia leve em crochê, perfeita para compor o look à beira-mar.",
    categoria: "mock-cat-saidas",
    tipo_origem: "revenda",
    tags: ["saída de praia"],
    ativo: true,
    variacoes: [
      {
        id: "mock-2-v1",
        produto: "mock-2",
        cor: "Branco",
        tamanho: "U",
        sku: "SAI-BOH-BR-U",
        preco: "149.90",
        preco_promocional: null,
        preco_vigente: "149.90",
        peso_gramas: 200,
        altura_cm: null,
        largura_cm: null,
        profundidade_cm: null,
        ativo: true,
        imagens: [
          {
            id: "mock-2-img1",
            variacao: "mock-2-v1",
            imagem: null,
            url_externa: IMG("photo-1515372039744-b8f02a3ae446"),
            alt_text: "Saída Boho Branca",
            ordem: 0,
          },
        ],
      },
    ],
  },
];
