import type { Config } from "tailwindcss";

/**
 * O accent do painel segue a cor primária da marca (CSS variable preenchida em
 * runtime pelo branding). Cores estruturais do painel permanecem neutras.
 */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: {
          // Área de trabalho num cinza levemente mais fundo que as superfícies:
          // é o contraste que faz a barra lateral e os cards "subirem".
          bg: "#eef1f6",
          surface: "#ffffff",
          surfaceMuted: "#f8fafc",
          // Barra lateral clara.
          sidebar: "#ffffff",
          sidebarHover: "#f1f5f9",
          sidebarBorder: "#e2e6ee",
          // Fundo escuro usado só na tela de login.
          brandDark: "#0b1220",
          // Texto.
          ink: "#0f172a",
          inkSoft: "#475569",
          inkMuted: "#94a3b8",
          border: "#e6e9ef",
          borderStrong: "#d5dae3",
          // Marca (preenchida em runtime pelo branding).
          accent: "var(--cor-primaria, #0891b2)",
          accentDark: "var(--cor-secundaria, #0e7490)",
          highlight: "var(--cor-destaque, #fb7185)",
        },
      },
      fontFamily: {
        // O fallback dentro do var() é essencial: sem ele, uma variável ausente
        // invalida a declaração inteira e o navegador cai no serifado padrão.
        sans: [
          "var(--fonte-painel, ui-sans-serif)",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Sombras curtas e difusas — profundidade sem "caixa flutuando".
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        cardHover:
          "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.05)",
        pop: "0 12px 32px -8px rgb(15 23 42 / 0.18)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      keyframes: {
        entrada: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        entrada: "entrada 0.18s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
