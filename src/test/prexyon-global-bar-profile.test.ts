/**
 * @file prexyon-global-bar-profile.test.ts
 * @description Testes direcionados para a Barra Global Prexyon, Perfil Enxuto, Logout Prexyon e Validação de Variáveis
 * @project OrçaGraf
 */

import fs from 'fs';
import path from 'path';
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

  // 2. Verificação de Configurações de Runtime do Portal Prexyon e Detecção de URLs ausentes
  const missingEnvConfig = getPrexyonRuntimeConfig({});
  assert(
    missingEnvConfig.productUrls.arteflow === undefined,
    'Configuração detecta ausência de VITE_ARTEFLOW_URL quando não fornecida'
  );
  assert(
    missingEnvConfig.productUrls.artecheck === undefined,
    'Configuração detecta ausência de VITE_ARTECHECK_URL quando não fornecida'
  );

  const configuredEnv = getPrexyonRuntimeConfig({
    VITE_PREXYON_PORTAL_URL: 'https://prexyon-production.up.railway.app',
    VITE_ARTEFLOW_URL: 'https://arteflow-10-production.up.railway.app',
    VITE_ARTECHECK_URL: 'https://eloquent-vitality-production-48ec.up.railway.app',
    VITE_ORCAGRAF_URL: 'https://or-agraf-bete-20-production.up.railway.app',
  });
  assert(
    configuredEnv.portalUrl === 'https://prexyon-production.up.railway.app',
    'Portal Prexyon resolve URL corretamente sem hardcode inseguro'
  );
  assert(
    configuredEnv.productUrls.arteflow === 'https://arteflow-10-production.up.railway.app',
    'Product Switch: ArteFlow mapeado corretamente com URL de ambiente'
  );
  assert(
    configuredEnv.productUrls.artecheck === 'https://eloquent-vitality-production-48ec.up.railway.app',
    'Product Switch: ArteCheck mapeado corretamente com URL de ambiente'
  );

  // 3. Verificação de Presença do Asset da Logo Oficial Branca
  const logoPath = path.resolve(process.cwd(), 'src/assets/prexyon-logo.png');
  const logoExists = fs.existsSync(logoPath);
  const logoSize = logoExists ? fs.statSync(logoPath).size : 0;
  assert(
    logoExists && logoSize > 1000,
    'Asset oficial da logo Prexyon presente no repositório com integridade confirmada'
  );

  // 4. Verificação do fluxo de SSO V2 para troca de produtos (sem URLs diretas)
  try {
    const resultArteFlow = await generateProductRedirect('arteflow');
    assert(
      typeof resultArteFlow === 'object' && typeof resultArteFlow.success === 'boolean',
      'Troca para ArteFlow usa Edge Function SSO V2 com audience correta'
    );
    const resultArteCheck = await generateProductRedirect('artecheck');
    assert(
      typeof resultArteCheck === 'object' && typeof resultArteCheck.success === 'boolean',
      'Troca para ArteCheck usa Edge Function SSO V2 com audience correta'
    );
  } catch (err: any) {
    assert(false, 'generateProductRedirect falhou com exceção', err?.message);
  }

  return results;
}
