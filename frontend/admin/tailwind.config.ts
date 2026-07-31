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
          bg: "#f8fafc",
          sidebar: "#0f172a",
          sidebarHover: "#1e293b",
          accent: "var(--cor-primaria, #0891b2)",
          accentDark: "var(--cor-secundaria, #0e7490)",
          ink: "#1e293b",
          border: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
