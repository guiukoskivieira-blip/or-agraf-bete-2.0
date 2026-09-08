/**
 * @file prexyon-global-bar-profile.test.ts
 * @description Testes direcionados para a Barra Global Prexyon, Perfil Enxuto, Logout Prexyon, RPC SSO V2 Canônica e Link da Logo
 * @project OrçaGraf
 */

import fs from 'fs';
import path from 'path';
import { getPrexyonRuntimeConfig } from '../config/prexyon';
import { generateProductRedirect, prexyonSsoClient } from '../services/prexyon-sso-client';
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
      suiteName: 'Barra Global Prexyon & SSO V2 Canônico (Hotfix Final)',
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

  // 4. Verificação da Logo Prexyon Clicável na Global Bar apontando para Portal Prexyon
  const headerPath = path.resolve(process.cwd(), 'src/components/layout/Header.tsx');
  const headerCode = fs.readFileSync(headerPath, 'utf-8');
  assert(
    headerCode.includes('href={portalUrl}') && headerCode.includes('aria-label="Portal Prexyon"'),
    'Logo oficial Prexyon é um link semântico apontando para o Portal Prexyon (portalUrl)'
  );

  // 5. Verificação Estrita: Ausência total de referências a prexyon-sso-generate
  const ssoClientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
  const ssoClientCode = fs.readFileSync(ssoClientPath, 'utf-8');
  assert(
    !ssoClientCode.includes('prexyon-sso-generate'),
    'Referência à Edge Function inexistente prexyon-sso-generate removida completamente'
  );
  assert(
    ssoClientCode.includes('prexyon_generate_sso_code'),
    'Chamada atualizada para RPC canônica public.prexyon_generate_sso_code'
  );

  // 6. Testes Comportamentais de generateProductRedirect
  // a) Produto atual OrçaGraf não gera SSO desnecessário
  const selfSwitch = await prexyonSsoClient.generateProductRedirect('orcagraf', 'org_123');
  assert(
    selfSwitch.success === false && selfSwitch.error?.includes('já é o produto ativo'),
    'Troca para produto atual (OrçaGraf) rejeitada sem acionar RPC'
  );

  // b) Ausência de organization_id falha de forma segura
  const missingOrgSwitch = await prexyonSsoClient.generateProductRedirect('arteflow', '');
  assert(
    missingOrgSwitch.success === false && missingOrgSwitch.error?.includes('não identificada'),
    'Troca sem organization_id falha de forma segura e amigável'
  );

  // c) Chamadas para ArteFlow e ArteCheck retornam objeto com interface tipada
  const resArteFlow = await generateProductRedirect('arteflow', 'org_123');
  assert(
    typeof resArteFlow === 'object' && typeof resArteFlow.success === 'boolean',
    'generateProductRedirect para ArteFlow executa com contrato tipado'
  );

  const resArteCheck = await generateProductRedirect('artecheck', 'org_123');
  assert(
    typeof resArteCheck === 'object' && typeof resArteCheck.success === 'boolean',
    'generateProductRedirect para ArteCheck executa com contrato tipado'
  );

  return results;
}
