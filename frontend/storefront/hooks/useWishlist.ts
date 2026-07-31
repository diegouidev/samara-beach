/**
 * Lista de desejos (Fase 2) — local (zustand+localStorage).
 * Arquitetura aberta: quando o backend expuser wishlist por cliente,
 * basta sincronizar como fazemos com o carrinho.
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  slugs: string[];
  alternar: (slug: string) => void;
  contem: (slug: string) => boolean;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      alternar: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((s) => s !== slug)
            : [...state.slugs, slug],
        })),
      contem: (slug) => get().slugs.includes(slug),
    }),
    { name: "sb-wishlist" },
  ),
);
