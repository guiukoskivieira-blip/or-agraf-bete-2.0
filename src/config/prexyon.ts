import { PrexyonProductId, PrexyonRuntimeMode } from '../types/prexyon';

export interface PrexyonRuntimeConfig {
  mode: PrexyonRuntimeMode;
  portalUrl?: string;
  productUrls: Partial<Record<PrexyonProductId, string>>;
}

function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost'
      ? parsed.toString().replace(/\/$/, '')
      : undefined;
  } catch {
    return undefined;
  }
}

export function getPrexyonRuntimeConfig(
  env: Record<string, unknown> = import.meta.env
): PrexyonRuntimeConfig {
  const requestedMode = env.VITE_PREXYON_MODE === 'platform' ? 'platform' : 'standalone';
  const portalUrl = normalizeUrl(env.VITE_PREXYON_PORTAL_URL);

  // O modo plataforma só é ativado quando existe um portal HTTPS/localhost válido.
  const mode: PrexyonRuntimeMode = requestedMode === 'platform' && portalUrl
    ? 'platform'
    : 'standalone';

  return {
    mode,
    portalUrl,
    productUrls: {
      artecheck: normalizeUrl(env.VITE_ARTECHECK_URL),
      arteflow: normalizeUrl(env.VITE_ARTEFLOW_URL),
    },
  };
}
