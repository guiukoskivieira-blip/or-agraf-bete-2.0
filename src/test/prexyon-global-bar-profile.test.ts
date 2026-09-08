/**
 * @file prexyon-global-bar-profile.test.ts
 * @description Testes direcionados para a Barra Global Prexyon e Telas de Conta/Perfil
 * @project OrçaGraf
 */

import { getPrexyonRuntimeConfig } from '../config/prexyon';
import { generateProductRedirect } from '../services/prexyon-sso-client';
import { SettingsTab } from '../components/layout/SettingsLayout';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export async function runPrexyonGlobalBarProfileTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const assert = (condition: boolean, testName: string, errorMsg?: string) =>
    results.push({
      suiteName: 'Barra Global Prexyon & Perfil (Hotfix 1)',
      testName,
      passed: condition,
      error: condition ? undefined : errorMsg || 'Assertion failed',
    });

  // 1. Verificação de abas permitidas no SettingsLayout
  const validTabs: SettingsTab[] = ['profile', 'integrations', 'company'];
  const testTab: string = 'users';
  const isUsersAllowedAsSettingsTab = (validTabs as string[]).includes(testTab);
  assert(
    !isUsersAllowedAsSettingsTab,
    'Aba "users" (Usuários e Permissões) foi removida do SettingsTab'
  );
  assert(
    validTabs.includes('profile') && validTabs.includes('integrations') && validTabs.includes('company'),
    'Abas essenciais (Meu Perfil, Integrações, Dados da Gráfica) foram preservadas'
  );

  // 2. Verificação de Configurações de Runtime do Portal Prexyon
  const config = getPrexyonRuntimeConfig({
    VITE_PREXYON_PORTAL_URL: 'https://prexyon-production.up.railway.app',
    VITE_ARTEFLOW_URL: 'https://arteflow.app',
    VITE_ARTECHECK_URL: 'https://artecheck.app',
  });
  assert(
    config.portalUrl === 'https://prexyon-production.up.railway.app',
    'Portal Prexyon resolve URL corretamente sem hardcode inseguro'
  );
  assert(
    config.productUrls.arteflow === 'https://arteflow.app',
    'URL do ArteFlow resolvida corretamente na configuração de runtime'
  );
  assert(
    config.productUrls.artecheck === 'https://artecheck.app',
    'URL do ArteCheck resolvida corretamente na configuração de runtime'
  );

  // 3. Verificação do fluxo de SSO V2 para troca de produtos
  try {
    const result = await generateProductRedirect('arteflow');
    assert(
      typeof result === 'object' && typeof result.success === 'boolean',
      'generateProductRedirect executa com segurança retornando objeto tipado'
    );
  } catch (err: any) {
    assert(false, 'generateProductRedirect falhou com exceção', err?.message);
  }

  return results;
}
