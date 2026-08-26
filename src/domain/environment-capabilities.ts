/**
 * @file environment-capabilities.ts
 * @description Definição canônica das capacidades e honestidade do ambiente de execução
 * @project OrçaGraf
 */

import { getPrexyonRuntimeConfig } from '../config/prexyon';
import { PrexyonRuntimeMode } from '../types/prexyon';

export interface EnvironmentCapabilities {
  mode: PrexyonRuntimeMode;
  canUseWhatsApp: boolean;
  canUseArteFlow: boolean;
  canUseArteCheck: boolean;
  hasRealAuthentication: boolean;
  hasRealOrganization: boolean;
  isDemoData: boolean;
}

export function getEnvironmentCapabilities(
  env: Record<string, unknown> = import.meta.env
): EnvironmentCapabilities {
  const runtime = getPrexyonRuntimeConfig(env);
  const isPlatform = runtime.mode === 'platform';

  return {
    mode: runtime.mode,
    // No modo standalone, nenhuma integração externa real está ativa ou configurada
    canUseWhatsApp: isPlatform && Boolean(env.VITE_ENABLE_WHATSAPP_INTEGRATION === 'true'),
    canUseArteFlow: isPlatform && Boolean(runtime.productUrls.arteflow),
    canUseArteCheck: isPlatform && Boolean(runtime.productUrls.artecheck),
    hasRealAuthentication: isPlatform,
    hasRealOrganization: isPlatform,
    isDemoData: !isPlatform,
  };
}
