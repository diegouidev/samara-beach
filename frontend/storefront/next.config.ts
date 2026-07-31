import type { NextConfig } from "next";

// Em produção atrás do proxy, NEXT_PUBLIC_API_URL pode ser "" (mesma origem);
// para o allowlist de imagens usamos o host interno do backend como referência.
const imgRef =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL_INTERNAL ||
  "http://localhost:8000";
const { hostname } = new URL(imgRef);

const nextConfig: NextConfig = {
  // Necessário para o Docker de produção (imagem enxuta).
  output: "standalone",
  images: {
    // Permite servir imagens de produto vindas do backend Django (media/).
    remotePatterns: [
      {
        protocol: imgRef.startsWith("https") ? "https" : "http",
        hostname,
        port: hostname === "localhost" ? "8000" : "",
        pathname: "/**",
      },
      // Placeholders usados nos mocks.
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
