/**
 * @file supabase-client.ts
 * @description Cliente Supabase Oficial do OrçaGraf (Prexyon-Ready)
 * @project OrçaGraf
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectUrl?: string;
  isConfigured: boolean;
  isModeConnected: boolean;
}

/**
 * Avalia as variáveis de ambiente e determina se o modo autenticado está habilitado e configurado.
 */
export function getSupabaseConfig(
  env: Record<string, unknown> = import.meta.env
): SupabaseConfig {
  const mode = String(env.VITE_PREXYON_MODE || '').trim().toLowerCase();
  const isModeConnected = mode === 'connected' || mode === 'platform';

  const supabaseUrl = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const supabaseAnonKey =
    typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string' && env.VITE_SUPABASE_PUBLISHABLE_KEY.trim() !== ''
      ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : typeof env.VITE_SUPABASE_ANON_KEY === 'string'
        ? env.VITE_SUPABASE_ANON_KEY.trim()
        : '';

  const redirectUrl =
    typeof env.VITE_AUTH_REDIRECT_URL === 'string' && env.VITE_AUTH_REDIRECT_URL.trim() !== ''
      ? env.VITE_AUTH_REDIRECT_URL.trim()
      : undefined;

  let isValidUrl = false;
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      isValidUrl = parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      isValidUrl = false;
    }
  }

  const isConfigured = Boolean(isValidUrl && supabaseAnonKey);

  return {
    supabaseUrl,
    supabaseAnonKey,
    redirectUrl,
    isConfigured,
    isModeConnected,
  };
}

let clientInstance: SupabaseClient | null = null;

/**
 * Retorna a instância única do cliente Supabase.
 * Retorna null caso as credenciais públicas mínimas não estejam configuradas.
 */
export function getSupabaseClient(
  env: Record<string, unknown> = import.meta.env
): SupabaseClient | null {
  const config = getSupabaseConfig(env);

  if (!config.isConfigured) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}

/**
 * Reseta o singleton do cliente Supabase (usado primariamente em testes).
 */
export function resetSupabaseClient(): void {
  clientInstance = null;
}
