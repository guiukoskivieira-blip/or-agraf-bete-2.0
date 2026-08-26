import { getPrexyonRuntimeConfig } from '../config/prexyon';
import { PrexyonPlatformService } from '../services/prexyon-platform.service';
import { PrexyonSessionContract } from '../types/prexyon';
import { TestResult } from './domain-integrity.test';

export function runPrexyonReadinessTests(): TestResult[] {
  const results: TestResult[] = [];
  const assert = (condition: boolean, testName: string) => results.push({
    suiteName: '21. Preparação Prexyon',
    testName,
    passed: condition,
    error: condition ? undefined : 'Assertion failed',
  });

  const standalone = getPrexyonRuntimeConfig({ VITE_PREXYON_MODE: 'standalone' });
  assert(standalone.mode === 'standalone', 'OrçaGraf permanece autônomo sem portal configurado');

  const invalidPlatform = getPrexyonRuntimeConfig({
    VITE_PREXYON_MODE: 'platform',
    VITE_PREXYON_PORTAL_URL: 'javascript:alert(1)',
  });
  assert(invalidPlatform.mode === 'standalone', 'URL insegura não ativa o modo plataforma');

  const platform = getPrexyonRuntimeConfig({
    VITE_PREXYON_MODE: 'platform',
    VITE_PREXYON_PORTAL_URL: 'https://app.prexyon.example',
    VITE_ARTECHECK_URL: 'https://artecheck.prexyon.example',
    VITE_ARTEFLOW_URL: 'https://arteflow.prexyon.example',
  });
  assert(platform.mode === 'platform', 'Portal válido ativa o modo plataforma');

  const session: PrexyonSessionContract = {
    identity: { userId: 'usr_1', email: 'teste@example.com', displayName: 'Teste' },
    membership: { organizationId: 'org_1', tenantId: 'tenant_1', role: 'owner' },
    entitlements: [
      { productId: 'orcagraf', status: 'active' },
      { productId: 'artecheck', status: 'trial' },
      { productId: 'arteflow', status: 'unavailable' },
    ],
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-01-01T01:00:00.000Z',
  };

  assert(PrexyonPlatformService.hasProductAccess(session, 'orcagraf'), 'Plano ativo libera OrçaGraf');
  assert(PrexyonPlatformService.hasProductAccess(session, 'artecheck'), 'Período de teste libera ArteCheck');
  assert(!PrexyonPlatformService.hasProductAccess(session, 'arteflow'), 'Produto indisponível permanece bloqueado');
  assert(
    PrexyonPlatformService.getProductUrl(platform, 'artecheck', session) === 'https://artecheck.prexyon.example',
    'URL de produto só é fornecida quando há entitlement'
  );
  assert(
    PrexyonPlatformService.getProductUrl(platform, 'arteflow', session) === null,
    'Sem entitlement não há navegação para outro produto'
  );

  const envelope = PrexyonPlatformService.buildEventEnvelope({
    eventName: 'QUOTE_APPROVED',
    destinationProduct: 'arteflow',
    organizationId: 'org_1',
    tenantId: 'tenant_1',
    correlationId: 'quote_1',
    idempotencyKey: 'quote_1:approved:v1',
    payload: { quoteId: 'quote_1' },
    eventId: 'evt_1',
    occurredAt: '2026-01-01T00:00:00.000Z',
  });
  assert(
    envelope.sourceProduct === 'orcagraf' && envelope.destinationProduct === 'arteflow',
    'Evento identifica origem e destino sem acoplamento direto'
  );
  assert(envelope.idempotencyKey === 'quote_1:approved:v1', 'Evento exige chave idempotente');

  return results;
}
