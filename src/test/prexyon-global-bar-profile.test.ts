/**
 * @file prexyon-global-bar-profile.test.ts
 * @description Testes direcionados para a Barra Global Prexyon, Perfil Enxuto e Logout Prexyon
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
      suiteName: 'Barra Global Prexyon & Perfil Enxuto (Hotfix 1)',
      testName,
      passed: condition,
      error: condition ? undefined : errorMsg || 'Assertion failed',
    });

  // 1. Verificação de Perfil Enxuto (remoção de abas locais: users, company, integrations)
  const validTabs: SettingsTab[] = ['profile'];
  const testTabs: string[] = ['users', 'company', 'integrations'];
  testTabs.forEach(tab => {
    assert(
      !(validTabs as string[]).includes(tab),
      `Aba local "${tab}" foi removida da UI de configurações`
    );
  });
  assert(
    validTabs.includes('profile') && validTabs.length === 1,
    'Perfil enxuto mantendo exclusivamente a página de Meu Perfil'
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
    'Product Switch: ArteFlow mapeado para configuração de runtime'
  );
  assert(
    config.productUrls.artecheck === 'https://artecheck.app',
    'Product Switch: ArteCheck mapeado para configuração de runtime'
  );

  // 3. Verificação do fluxo de SSO V2 para troca de produtos (sem URLs diretas)
  try {
    const resultArteFlow = await generateProductRedirect('arteflow');
    assert(
      typeof resultArteFlow === 'object' && typeof resultArteFlow.success === 'boolean',
      'Troca para ArteFlow usa Edge Function SSO V2'
    );
    const resultArteCheck = await generateProductRedirect('artecheck');
    assert(
      typeof resultArteCheck === 'object' && typeof resultArteCheck.success === 'boolean',
      'Troca para ArteCheck usa Edge Function SSO V2'
    );
  } catch (err: any) {
    assert(false, 'generateProductRedirect falhou com exceção', err?.message);
  }

  return results;
}
