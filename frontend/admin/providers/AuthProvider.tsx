/**
 * Auth do painel interno. Só permite usuários internos (is_interno).
 * Guarda o usuário e expõe login/logout + checagem de papel.
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
import type { PapelInterno, Usuario } from "@/lib/types";

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  /** true se o usuário tem um dos papéis (admin sempre passa). */
  temPapel: (papeis: PapelInterno[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!api.tokenStore.access) {
      setUsuario(null);
      return;
    }
    try {
      const me = await api.getMe();
      setUsuario(me.is_interno ? me : null);
      if (!me.is_interno) api.tokenStore.clear();
    } catch {
      api.tokenStore.clear();
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { user } = await api.login(email, senha);
    if (!user.is_interno) {
      api.tokenStore.clear();
      throw new Error("Acesso restrito à equipe interna.");
    }
    setUsuario(user);
  }, []);

  const sair = useCallback(async () => {
    await api.logout();
    setUsuario(null);
  }, []);

  const temPapel = useCallback(
    (papeis: PapelInterno[]) => {
      if (!usuario) return false;
      if (usuario.papel === "admin") return true;
      return usuario.papel != null && papeis.includes(usuario.papel);
    },
    [usuario],
  );

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, entrar, sair, temPapel }}
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
