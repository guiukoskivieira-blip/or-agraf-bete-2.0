/**
 * @file AuthContext.tsx
 * @description Contexto de Autenticação Real Supabase (Fase 2A) com Fallback Standalone
 * @project OrçaGraf
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseConfig } from '../services/supabase-client';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  configError: string | null;
  isConfigured: boolean;
  isModeConnected: boolean;
  isAuthenticated: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = useMemo(() => getSupabaseConfig(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(config.isModeConnected && config.isConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(
    config.isModeConnected && !config.isConfigured
      ? 'Configuração do Supabase incompleta. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
      : null
  );

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  useEffect(() => {
    // 1. Modo Standalone: Sem Supabase, não carrega sessão e não trava a interface
    if (!config.isModeConnected) {
      setLoading(false);
      setUser(null);
      setSession(null);
      return;
    }

    // 2. Modo Conectado com Configuração Incompleta: Exibe erro técnico
    if (!config.isConfigured) {
      setConfigError(
        'Configuração do Supabase incompleta. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 3. Carrega Sessão Inicial
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          setAuthError('Não foi possível verificar a sessão ativa.');
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthError('Erro de conexão ao verificar sessão.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    // 4. Escuta Mudanças de Estado de Autenticação com Cleanup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [config]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      clearError();
      const supabase = getSupabaseClient();

      if (!config.isModeConnected || !supabase) {
        return { error: new Error('Autenticação indisponível no modo atual.') };
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          const safeMessage = 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
          setAuthError(safeMessage);
          return { error: new Error(safeMessage) };
        }

        return { error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao autenticar.';
        setAuthError(message);
        return { error: new Error(message) };
      } finally {
        setLoading(false);
      }
    },
    [config.isModeConnected, clearError]
  );

  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    clearError();
    const supabase = getSupabaseClient();

    if (!supabase) {
      setUser(null);
      setSession(null);
      return { error: null };
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      if (error) {
        setAuthError(error.message);
        return { error };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao encerrar sessão.';
      setAuthError(message);
      return { error: new Error(message) };
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ error: Error | null }> => {
      clearError();
      const supabase = getSupabaseClient();

      if (!config.isModeConnected || !supabase) {
        return { error: new Error('Recuperação indisponível no modo atual.') };
      }

      try {
        const redirectUrl = config.redirectUrl || window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: redirectUrl,
        });

        if (error) {
          // Mantém honestidade no log interno, mas evita expor detalhe que permita enumeração de e-mails
          console.warn('[Auth] Erro ao solicitar reset de senha:', error.message);
        }

        // Não propaga erro para manter comportamento que não revela existência de conta
        return { error: null };
      } catch (err: unknown) {
        console.warn('[Auth] Exceção em resetPasswordForEmail:', err);
        return { error: null };
      }
    },
    [config.isModeConnected, config.redirectUrl, clearError]
  );

  const updatePassword = useCallback(
    async (newPassword: string): Promise<{ error: Error | null }> => {
      clearError();
      const supabase = getSupabaseClient();

      if (!supabase) {
        return { error: new Error('Operação indisponível.') };
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          setAuthError(error.message);
          return { error };
        }

        return { error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao atualizar senha.';
        setAuthError(message);
        return { error: new Error(message) };
      } finally {
        setLoading(false);
      }
    },
    [clearError]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      loading,
      authError,
      configError,
      isConfigured: config.isConfigured,
      isModeConnected: config.isModeConnected,
      isAuthenticated: Boolean(user && session),
      signInWithPassword,
      signOut,
      requestPasswordReset,
      updatePassword,
      clearError,
    }),
    [
      user,
      session,
      loading,
      authError,
      configError,
      config.isConfigured,
      config.isModeConnected,
      signInWithPassword,
      signOut,
      requestPasswordReset,
      updatePassword,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
