/**
 * @file supabase-client.ts
 * @description Cliente Supabase Oficial do OrçaGraf (Prexyon-Ready - Publishable Key Exclusiva)
 * @project OrçaGraf
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  redirectUrl?: string;
  isConfigured: boolean;
  isModeConnected: boolean;
}

/**
 * Avalia as variáveis de ambiente e determina se o modo autenticado está habilitado e configurado.
 * Utiliza EXCLUSIVAMENTE VITE_SUPABASE_PUBLISHABLE_KEY (sem fallback para chaves legadas anon).
 */
export function getSupabaseConfig(
  env: Record<string, unknown> = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {})
): SupabaseConfig {
  const safeEnv = env || {};
  const mode = String(safeEnv.VITE_PREXYON_MODE || '').trim().toLowerCase();
  const isModeConnected = mode === 'connected' || mode === 'platform';

  const supabaseUrl = typeof safeEnv.VITE_SUPABASE_URL === 'string' ? safeEnv.VITE_SUPABASE_URL.trim() : '';
  const supabasePublishableKey =
    typeof safeEnv.VITE_SUPABASE_PUBLISHABLE_KEY === 'string' && safeEnv.VITE_SUPABASE_PUBLISHABLE_KEY.trim() !== ''
      ? safeEnv.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : '';

  const redirectUrl =
    typeof safeEnv.VITE_AUTH_REDIRECT_URL === 'string' && safeEnv.VITE_AUTH_REDIRECT_URL.trim() !== ''
      ? safeEnv.VITE_AUTH_REDIRECT_URL.trim()
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

  const isConfigured = Boolean(isValidUrl && supabasePublishableKey);

  return {
    supabaseUrl,
    supabasePublishableKey,
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
  env: Record<string, unknown> = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {})
): SupabaseClient | null {
  const config = getSupabaseConfig(env);

  if (!config.isConfigured) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(config.supabaseUrl, config.supabasePublishableKey, {
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

export function isModeConnected(env?: Record<string, unknown>): boolean {
  return getSupabaseConfig(env).isModeConnected;
}

export function isSupabaseConfigured(env?: Record<string, unknown>): boolean {
  return getSupabaseConfig(env).isConfigured;
}
