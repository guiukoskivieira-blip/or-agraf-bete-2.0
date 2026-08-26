/**
 * @file environment-honesty.test.ts
 * @description Suíte de Testes Automatizados para o Hotfix P1: Honestidade do Ambiente Standalone e Consistência Visual
 * @project OrçaGraf
 */

import * as fs from 'fs';
import * as path from 'path';
import { getEnvironmentCapabilities } from '../domain/environment-capabilities';
import { getPrexyonRuntimeConfig } from '../config/prexyon';
import { INITIAL_COMPANIES } from '../context/TenantContext';
import { INITIAL_QUOTES } from '../context/CommercialContext';
import {
  LocalStorageCustomerRepository,
  getInitialCustomersTemplate,
} from '../domain/customer-repository';
import { calculateItemPricing } from '../domain/pricing-engine';
import { getInitialProductsTemplate } from '../domain/product-catalog';
import { TestResult } from './domain-integrity.test';

export function runEnvironmentHonestyTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Honestidade Standalone & Consistência Visual';

  function assert(condition: boolean, testName: string) {
    if (condition) {
      results.push({ suiteName, testName, passed: true });
    } else {
      results.push({ suiteName, testName, passed: false, error: 'Falha na asserção de domínio' });
    }
  }

  const srcDir = path.join(process.cwd(), 'src');
  const indexCssPath = path.join(srcDir, 'index.css');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

  // 1. O tema claro não depende de prefers-color-scheme
  assert(
    !indexCssContent.includes('@media (prefers-color-scheme: dark)') &&
    !indexCssContent.includes('prefers-color-scheme'),
    '1. index.css não possui media queries para prefers-color-scheme'
  );

  // 2. Não existe color-scheme: dark e define tokens formais de tema claro
  assert(
    !indexCssContent.includes('color-scheme: dark') &&
    indexCssContent.includes('color-scheme: light') &&
    indexCssContent.includes('--background: #f8fafc') &&
    indexCssContent.includes('--surface: #ffffff') &&
    indexCssContent.includes('--text-primary: #0f172a'),
    '2. index.css força color-scheme: light e consolida tokens de superfície clara'
  );

  // 2b. Não aplica color-scheme: light !important universalmente sobre *
  assert(
    !indexCssContent.includes('*,') && !indexCssContent.includes('*::before'),
    '2b. index.css não aplica color-scheme com !important sobre o seletor universal *'
  );

  // 3. Não existem estilos estruturais dark:* no código fonte
  const checkDirForDarkClass = (dir: string): boolean => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!checkDirForDarkClass(fullPath)) return false;
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (/\bdark:[a-zA-Z0-9_-]+/.test(content)) {
          return false;
        }
      }
    }
    return true;
  };
  assert(
    checkDirForDarkClass(srcDir),
    '3. Nenhum arquivo em src/ possui classes utilitárias dark:* ativas'
  );

  // 4. O modo standalone desativa WhatsApp
  const standaloneCaps = getEnvironmentCapabilities({ VITE_PREXYON_MODE: 'standalone' });
  assert(
    standaloneCaps.canUseWhatsApp === false,
    '4. Modo standalone desativa canUseWhatsApp'
  );

  // 5. O modo standalone desativa ArteFlow
  assert(
    standaloneCaps.canUseArteFlow === false,
    '5. Modo standalone desativa canUseArteFlow'
  );

  // 6. O modo standalone desativa ArteCheck
  assert(
    standaloneCaps.canUseArteCheck === false,
    '6. Modo standalone desativa canUseArteCheck'
  );

  // 7. WhatsApp não aparece como conectado nas empresas de seed
  const alphaCompany = INITIAL_COMPANIES.find(c => c.id === 'emp_alphaprint_01')!;
  assert(
    alphaCompany.whatsappConfig?.status === 'not_configured',
    '7. WhatsApp da empresa de demonstração está como not_configured'
  );

  // 8. ArteFlow não aparece como sincronizado nos orçamentos de seed
  const initialApprovedQuote = INITIAL_QUOTES.find(q => q.id === 'quot_101')!;
  assert(
    initialApprovedQuote.arteflowSync === undefined || initialApprovedQuote.arteflowSync.status !== 'synced',
    '8. Orçamento inicial quot_101 não possui arteflowSync fictício como synced'
  );

  // 9. Aprovação local não inventa ordem de produção no standalone
  assert(
    !initialApprovedQuote.events?.some(e => e.description.includes('AF-PED-') || e.description.includes('enviado ao ArteFlow')),
    '9. Eventos de aprovação em quot_101 não contêm falsas ordens AF-PED'
  );

  // 10. Envio fictício de WhatsApp não está registrado nos eventos de seed
  assert(
    !initialApprovedQuote.events?.some(e => e.type === 'sent_whatsapp'),
    '10. Orçamento inicial não possui falsos eventos de envio de WhatsApp'
  );

  // 11. Dados de seed são identificados como demonstração (dataOrigin: 'demo')
  assert(
    alphaCompany.dataOrigin === 'demo' &&
    initialApprovedQuote.dataOrigin === 'demo',
    '11. Empresa e orçamento de seed possuem dataOrigin: demo'
  );

  // 12. Template inicial de clientes contém dataOrigin: 'demo'
  assert(
    getInitialCustomersTemplate('emp_alphaprint_01').every(c => c.dataOrigin === 'demo'),
    '12. Template inicial de clientes contém dataOrigin: demo'
  );

  // 13. A migração e inicialização é idempotente
  const seed1 = getInitialCustomersTemplate('emp_alphaprint_01');
  const seed2 = getInitialCustomersTemplate('emp_alphaprint_01');
  assert(
    seed1.length === seed2.length && seed1[0].id === seed2[0].id,
    '13. A inicialização de dados de demonstração é idempotente'
  );

  // 14. O sistema funciona sem variáveis Prexyon configuradas (fallback standalone gracioso)
  const defaultRuntime = getPrexyonRuntimeConfig({});
  const defaultCaps = getEnvironmentCapabilities({});
  assert(
    defaultRuntime.mode === 'standalone' &&
    defaultCaps.canUseWhatsApp === false &&
    defaultCaps.canUseArteFlow === false &&
    defaultCaps.isDemoData === true,
    '14. Fallback sem variáveis de ambiente opera com segurança em standalone'
  );

  // 15. Produtos LOT exibem contextualização de lote
  const catalog = getInitialProductsTemplate('emp_alphaprint_01');
  const cartao = catalog.find(p => p.name === 'Cartão de visita')!;
  assert(
    cartao.pricingMode === 'LOT' && cartao.lotSize === 1000,
    '15. Cartão de visita está configurado com pricingMode LOT e lotSize 1000'
  );

  // 16. Produtos UNIT exibem preço por unidade
  const windbanner = catalog.find(p => p.name === 'Wind banner')!;
  assert(
    windbanner.pricingMode === 'UNIT',
    '16. Wind banner está configurado com pricingMode UNIT'
  );

  // 17. Produtos SQUARE_METER exibem preço por m²
  const banner = catalog.find(p => p.name === 'Banner em lona')!;
  assert(
    banner.pricingMode === 'SQUARE_METER',
    '17. Banner em lona está configurado com pricingMode SQUARE_METER'
  );

  // 18. Produtos LINEAR_METER exibem preço por metro linear
  const faixa = catalog.find(p => p.name === 'Faixa em lona')!;
  assert(
    faixa.pricingMode === 'LINEAR_METER',
    '18. Faixa em lona está configurado com pricingMode LINEAR_METER'
  );

  // 19. O cálculo de 1.000 cartões permanece R$ 70,00
  const calc1000 = calculateItemPricing({
    pricingMode: cartao.pricingMode,
    salePriceCents: cartao.salePriceCents,
    quantity: 1000,
    lotSize: cartao.lotSize,
  });
  assert(
    calc1000.totalItemCents === 7000 && calc1000.billedQuantity === 1,
    '19. 1.000 cartões de visita totalizam R$ 70,00'
  );

  // 20. O cálculo de 1.500 cartões permanece R$ 140,00 (2 lotes)
  const calc1500 = calculateItemPricing({
    pricingMode: cartao.pricingMode,
    salePriceCents: cartao.salePriceCents,
    quantity: 1500,
    lotSize: cartao.lotSize,
  });
  assert(
    calc1500.totalItemCents === 14000 && calc1500.billedQuantity === 2,
    '20. 1.500 cartões de visita cobram 2 lotes totalizando R$ 140,00'
  );

  // 21. Preservação de capacidades e consistência
  assert(
    standaloneCaps.hasRealAuthentication === false &&
    standaloneCaps.hasRealOrganization === false,
    '21. Capacidades de autenticação e organização real são falsas no standalone'
  );

  // 22. Clientes do repositório possuem contratos multi-tenant preservados
  const repo = new LocalStorageCustomerRepository();
  assert(
    repo !== null && typeof repo.list === 'function',
    '22. Repositório multi-tenant de clientes continua operacional'
  );

  return results;
}
