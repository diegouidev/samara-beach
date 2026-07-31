/**
 * Carrinho persistente (visitante) — zustand + localStorage.
 *
 * O carrinho funciona sem login: itens ficam localmente até o checkout,
 * quando são sincronizados com o carrinho do backend (ver lib/api.sincronizarCarrinho).
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LinhaCarrinho } from "@/lib/types";

interface CartState {
  itens: LinhaCarrinho[];
  adicionar: (linha: LinhaCarrinho) => void;
  remover: (variacaoId: string) => void;
  alterarQtd: (variacaoId: string, quantidade: number) => void;
  limpar: () => void;
  // seletores derivados
  totalItens: () => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      itens: [],

      adicionar: (linha) =>
        set((state) => {
          const existente = state.itens.find(
            (i) => i.variacaoId === linha.variacaoId,
          );
          if (existente) {
            return {
              itens: state.itens.map((i) =>
                i.variacaoId === linha.variacaoId
                  ? { ...i, quantidade: i.quantidade + linha.quantidade }
                  : i,
              ),
            };
          }
          return { itens: [...state.itens, linha] };
        }),

      remover: (variacaoId) =>
        set((state) => ({
          itens: state.itens.filter((i) => i.variacaoId !== variacaoId),
        })),

      alterarQtd: (variacaoId, quantidade) =>
        set((state) => ({
          itens: state.itens
            .map((i) =>
              i.variacaoId === variacaoId
                ? { ...i, quantidade: Math.max(1, quantidade) }
                : i,
            )
            .filter((i) => i.quantidade > 0),
        })),

      limpar: () => set({ itens: [] }),

      totalItens: () => get().itens.reduce((acc, i) => acc + i.quantidade, 0),

      subtotal: () =>
        get().itens.reduce(
          (acc, i) => acc + i.precoUnitario * i.quantidade,
          0,
        ),
    }),
    {
      name: "sb-carrinho",
    },
  ),
);
