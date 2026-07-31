/**
 * Contexto de autenticação (JWT). Guarda o usuário logado e expõe login/logout.
 * O token em si é gerido em lib/api (localStorage).
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
import type { Usuario } from "@/lib/types";

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizar = useCallback(async () => {
    if (!api.tokenStore.access) {
      setUsuario(null);
      return;
    }
    try {
      setUsuario(await api.getMe());
    } catch {
      api.tokenStore.clear();
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    atualizar().finally(() => setCarregando(false));
  }, [atualizar]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { user } = await api.login(email, senha);
    setUsuario(user);
  }, []);

  const sair = useCallback(async () => {
    await api.logout();
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, entrar, sair, atualizar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
