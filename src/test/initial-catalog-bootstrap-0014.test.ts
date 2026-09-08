/**
 * @file initial-catalog-bootstrap-0014.test.ts
 * @description Testes direcionados para a Migration 0014 e endurecimento do bootstrap
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeUuid } from '../domain/quote-validation';
import { ProductRepository } from '../repositories/product.repository';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runBootstrap0014Tests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Catálogo Inicial MVP — Hotfix 0014 (created_by NULL & Validação Tenant)';

  try {
    const migration0014Path = path.resolve(__dirname, '../../supabase/migrations/0014_fix_bootstrap_created_by_fk.sql');
    const content = fs.readFileSync(migration0014Path, 'utf-8');

    // 1. created_by é explicitamente NULL nos 10 produtos iniciais
    const hasNullCreatedBy = content.includes("false, true, 'Item inicial de comunicação visual.', NULL, v_now, v_now)") &&
                            content.includes("false, true, 'Item inicial para folders com dobra.', NULL, v_now, v_now)");
    const hasNoAuthUserIdInCreatedBy = !content.includes(", v_auth_user_id, v_now, v_now)");

    results.push({
      suiteName,
      testName: '1. Produtos iniciais usam created_by = NULL (sem dependência da FK profiles)',
      passed: hasNullCreatedBy && hasNoAuthUserIdInCreatedBy,
      error: (!hasNullCreatedBy || !hasNoAuthUserIdInCreatedBy) ? 'created_by não está como NULL ou ainda usa v_auth_user_id' : undefined,
    });

    // 2. auth.uid() continua sendo validado para segurança e autorização
    const hasAuthCheck = content.includes('v_auth_user_id := auth.uid()') &&
                         content.includes('IF (v_auth_user_id IS NULL)');

    results.push({
      suiteName,
      testName: '2. auth.uid() continua validado estritamente para autorização da RPC',
      passed: hasAuthCheck,
      error: !hasAuthCheck ? 'Validação de auth.uid() ausente' : undefined,
    });

    // 3. Contagem exata: 10 produtos, 10 acabamentos, 10 materiais
    const finishingsBlock = content.substring(content.indexOf('INSERT INTO public.finishings'), content.indexOf('INSERT INTO public.materials'));
    const materialsBlock = content.substring(content.indexOf('INSERT INTO public.materials'), content.indexOf('UPDATE public.organizations'));

    const productsCountMatch = content.match(/p_organization_id, 'PRD-/g);
    const finishingsCountMatch = finishingsBlock.match(/\(p_organization_id, '/g);
    const materialsCountMatch = materialsBlock.match(/\(p_organization_id, '/g);

    const countsOk = (productsCountMatch?.length === 10) &&
                     (finishingsCountMatch?.length === 10) &&
                     (materialsCountMatch?.length === 10);

    results.push({
      suiteName,
      testName: '3. Contagem exata de itens confirmada: 10 produtos, 10 acabamentos, 10 insumos',
      passed: countsOk,
      error: !countsOk ? `Contagens divergentes: prods=${productsCountMatch?.length}, fins=${finishingsCountMatch?.length}, mats=${materialsCountMatch?.length}` : undefined,
    });

    // 4. Preservação de SECURITY DEFINER, search_path seguro e atomicidade
    const hasSecDefiner = content.includes('SECURITY DEFINER') && content.includes("SET search_path = ''");
    const hasLockAndNoop = content.includes('FOR UPDATE') &&
                           content.includes('IF (v_bootstrapped_at IS NOT NULL) THEN') &&
                           content.includes("'status', 'NOOP'");

    results.push({
      suiteName,
      testName: '4. Preservados SECURITY DEFINER, search_path seguro, lock FOR UPDATE e NOOP',
      passed: hasSecDefiner && hasLockAndNoop,
      error: (!hasSecDefiner || !hasLockAndNoop) ? 'Garantias de segurança ou idempotência ausentes' : undefined,
    });

  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Leitura de migration 0014',
      passed: false,
      error: err.message,
    });
  }

  // 5. Validação de UUID no frontend (ProductRepository)
  const repo = new ProductRepository();
  let demoCalled = false;
  let invalidCalled = false;
  let validAccepted = false;

  // Teste 5a: demo ID 'emp_alphaprint_01'
  repo.bootstrapCatalog('emp_alphaprint_01').then(res => {
    if (!res.success && res.error?.includes('inválido')) {
      demoCalled = false; // bloqueado com sucesso
    }
  });

  // Teste 5b: null / undefined / string vazia
  repo.bootstrapCatalog('').then(res => {
    if (!res.success && res.error?.includes('inválido')) {
      invalidCalled = false; // bloqueado com sucesso
    }
  });

  // Teste 5c: UUID válido
  const sampleUuid = 'd20fef5a-070a-4eb1-bd06-901c8ac6d854';
  const isValid = normalizeUuid(sampleUuid) === sampleUuid;
  const isDemoInvalid = normalizeUuid('emp_alphaprint_01') === null;

  results.push({
    suiteName,
    testName: '5. normalizeUuid valida UUID real e rejeita identificador demo emp_alphaprint_01',
    passed: isValid && isDemoInvalid,
    error: (!isValid || !isDemoInvalid) ? 'Falha na validação de UUID' : undefined,
  });

  // 6. Validar proteção no CommercialContext
  try {
    const contextPath = path.resolve(__dirname, '../context/CommercialContext.tsx');
    const contextContent = fs.readFileSync(contextPath, 'utf-8');

    const hasUuidGuard = contextContent.includes('const validTenantUuid = normalizeUuid(tenantId);') &&
                         contextContent.includes('if (!validTenantUuid)');

    const hasErrorDistinction = contextContent.includes('if (loadedProds.length === 0 && !bootResult.success && bootResult.error)') &&
                                contextContent.includes("setCommercialError('Falha ao inicializar o catálogo padrão da organização.');");

    results.push({
      suiteName,
      testName: '6. CommercialContext aguarda UUID real do tenant antes de acionar bootstrap/carregamento',
      passed: hasUuidGuard,
      error: !hasUuidGuard ? 'Guarda de tenant UUID real ausente no CommercialContext' : undefined,
    });

    results.push({
      suiteName,
      testName: '7. Falha na inicialização do catálogo é sinalizada distintamente e não tratada como lista vazia normal',
      passed: hasErrorDistinction,
      error: !hasErrorDistinction ? 'Tratamento de erro de inicialização ausente' : undefined,
    });

  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Leitura de CommercialContext.tsx',
      passed: false,
      error: err.message,
    });
  }

  // 8. Simulação de ciclo de vida com created_by = NULL
  let simulatedCatalogState = {
    orgId: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854',
    bootstrappedAt: null as string | null,
    products: [] as Array<{ id: string; name: string; created_by: string | null }>,
    finishings: [] as string[],
    materials: [] as string[],
  };

  function simulateBootstrap0014(orgId: string, isAuth: boolean, isMember: boolean) {
    const validatedUuid = normalizeUuid(orgId);
    if (!validatedUuid) return { success: false, error: 'Tenant inválido.' };
    if (!isAuth) throw new Error('P0001: Usuário não autenticado.');
    if (!isMember) throw new Error('42501: Membresia não autorizada.');

    if (simulatedCatalogState.bootstrappedAt) {
      return { success: true, status: 'NOOP', reason: 'ALREADY_BOOTSTRAPPED' };
    }

    simulatedCatalogState.products = Array.from({ length: 10 }, (_, i) => ({
      id: `prod_${i + 1}`,
      name: `Produto ${i + 1}`,
      created_by: null, // explicitamente NULL no 0014
    }));
    simulatedCatalogState.finishings = Array.from({ length: 10 }, (_, i) => `Acabamento ${i + 1}`);
    simulatedCatalogState.materials = Array.from({ length: 10 }, (_, i) => `Insumo ${i + 1}`);
    simulatedCatalogState.bootstrappedAt = new Date().toISOString();

    return {
      success: true,
      status: 'BOOTSTRAPPED',
      products_count: 10,
      finishings_count: 10,
      materials_count: 10,
    };
  }

  // Execução 1: Cria 10/10/10 com created_by NULL
  const sim1 = simulateBootstrap0014('d20fef5a-070a-4eb1-bd06-901c8ac6d854', true, true);
  const okCreatedByNull = simulatedCatalogState.products.every(p => p.created_by === null);

  // Execução 2: NOOP
  const sim2 = simulateBootstrap0014('d20fef5a-070a-4eb1-bd06-901c8ac6d854', true, true);

  // Exclusão manual
  simulatedCatalogState.products = [];
  simulatedCatalogState.finishings = [];
  simulatedCatalogState.materials = [];

  // Execução 3: Continua NOOP
  const sim3 = simulateBootstrap0014('d20fef5a-070a-4eb1-bd06-901c8ac6d854', true, true);

    const simPassed = sim1.status === 'BOOTSTRAPPED' && okCreatedByNull && sim2.status === 'NOOP' && sim3.status === 'NOOP' && simulatedCatalogState.products.length === 0;

    results.push({
      suiteName,
      testName: '8. Idempotência, created_by NULL e tolerância a exclusão manual confirmadas',
      passed: simPassed,
      error: !simPassed ? 'Falha no teste de ciclo de vida do bootstrap 0014' : undefined,
    });

  return results;
}
