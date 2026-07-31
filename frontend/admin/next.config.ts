import type { NextConfig } from "next";

const imgRef =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL_INTERNAL ||
  "http://localhost:8000";
const { hostname } = new URL(imgRef);

const nextConfig: NextConfig = {
  // Servido sob /admin (o proxy Caddy roteia; em produção: samarabeach.com.br/admin).
  basePath: "/admin",
  // Necessário para o Docker de produção (output standalone).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: imgRef.startsWith("https") ? "https" : "http",
        hostname,
        port: hostname === "localhost" ? "8000" : "",
        pathname: "/**",
      },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
