"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { registrar, login as apiLogin } from "@/lib/api";

export default function LoginPage() {
  const { entrar } = useAuth();
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (modo === "registro") {
        await registrar({ email, password: senha, nome });
        await apiLogin(email, senha);
      }
      await entrar(email, senha);
      router.push("/conta/pedidos");
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Falha na autenticação.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex gap-2 rounded-full bg-brand-sand p-1 text-sm">
        <button
          onClick={() => setModo("login")}
          className={`flex-1 rounded-full py-2 ${
            modo === "login" ? "bg-white font-medium shadow" : "text-gray-500"
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => setModo("registro")}
          className={`flex-1 rounded-full py-2 ${
            modo === "registro" ? "bg-white font-medium shadow" : "text-gray-500"
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {modo === "registro" && (
          <div>
            <label className="text-sm font-medium">Nome completo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-sea focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-sea focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-sea focus:outline-none"
          />
        </div>

        {erro && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-full bg-brand-sea py-3 font-medium text-white hover:bg-brand-seaDark disabled:opacity-50"
        >
          {enviando
            ? "Aguarde..."
            : modo === "login"
              ? "Entrar"
              : "Criar conta e entrar"}
        </button>
      </form>
    </div>
  );
}
