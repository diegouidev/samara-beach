import type { Config } from "tailwindcss";

/**
 * As cores da marca usam CSS variables preenchidas em runtime pelo BrandingProvider
 * (a partir de /api/branding/). Os valores após a vírgula são fallbacks para o
 * primeiro paint (SSR) e caso a API não responda.
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
        brand: {
          sand: "var(--cor-fundo, #f5efe6)",
          sea: "var(--cor-primaria, #0891b2)",
          seaDark: "var(--cor-secundaria, #0e7490)",
          coral: "var(--cor-destaque, #fb7185)",
          ink: "var(--cor-texto, #1f2937)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
