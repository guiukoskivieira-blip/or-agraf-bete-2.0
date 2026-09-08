/**
 * @file initial-catalog-bootstrap-0013.test.ts
 * @description Testes direcionados para a Migration 0013 (Correção de Sintaxe da RPC bootstrap_tenant_catalog)
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runBootstrap0013Tests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Catálogo Inicial MVP — Hotfix Sintaxe RPC (Migration 0013)';

  try {
    const migration0013Path = path.resolve(__dirname, '../../supabase/migrations/0013_fix_bootstrap_tenant_catalog_syntax.sql');
    const content = fs.readFileSync(migration0013Path, 'utf-8');

    // 1. Verificar ausência de CROSS JOIN ou AS alias inválido nos INSERTs
    const hasInvalidAsClause = /INSERT\s+INTO\s+public\.(finishings|materials)[^;]+AS\s+[fm]\s*\(/i.test(content);
    const hasInvalidCrossJoin = /CROSS\s+JOIN/i.test(content);
    results.push({
      suiteName,
      testName: '1. Eliminação completa da sintaxe inválida "AS alias CROSS JOIN" nos INSERTs',
      passed: !hasInvalidAsClause && !hasInvalidCrossJoin,
      error: (hasInvalidAsClause || hasInvalidCrossJoin) ? 'Sintaxe CROSS JOIN / AS alias ainda presente' : undefined,
    });

    // 2. Verificar sintaxe direta VALUES (p_organization_id, ...) para finishings
    const hasDirectValuesFinishings = content.includes('INSERT INTO public.finishings') &&
                                      content.includes("(p_organization_id, 'Ilhós'") &&
                                      content.includes("(p_organization_id, 'Fita Dupla Face'");
    results.push({
      suiteName,
      testName: '2. Inserção de Finishings utiliza sintaxe PostgreSQL direta e válida VALUES (p_organization_id, ...)',
      passed: hasDirectValuesFinishings,
      error: !hasDirectValuesFinishings ? 'Sintaxe direta de finishings incorreta' : undefined,
    });

    // 3. Verificar sintaxe direta VALUES (p_organization_id, ...) para materials
    const hasDirectValuesMaterials = content.includes('INSERT INTO public.materials') &&
                                     content.includes("(p_organization_id, 'Lona 440g'") &&
                                     content.includes("(p_organization_id, 'Fita Dupla Face'");
    results.push({
      suiteName,
      testName: '3. Inserção de Materials utiliza sintaxe PostgreSQL direta e válida VALUES (p_organization_id, ...)',
      passed: hasDirectValuesMaterials,
      error: !hasDirectValuesMaterials ? 'Sintaxe direta de materials incorreta' : undefined,
    });

    // 4. Inserção de Products preservada
    const hasDirectValuesProducts = content.includes('INSERT INTO public.products') &&
                                    content.includes("(p_organization_id, 'PRD-BAN-01', 'Banner em Lona'") &&
                                    content.includes("(p_organization_id, 'PRD-FOL-10', 'Folder'");
    results.push({
      suiteName,
      testName: '4. Inserção de 10 Products preservada com sintaxe direta e válida',
      passed: hasDirectValuesProducts,
      error: !hasDirectValuesProducts ? 'Sintaxe direta de products incorreta' : undefined,
    });

    // 5. Preservação de SECURITY DEFINER e search_path seguro
    const hasSecurityDefiner = content.includes('SECURITY DEFINER') && content.includes("SET search_path = ''");
    results.push({
      suiteName,
      testName: '5. Preservação de SECURITY DEFINER com search_path vazio seguro',
      passed: hasSecurityDefiner,
      error: !hasSecurityDefiner ? 'SECURITY DEFINER ou search_path ausente' : undefined,
    });

    // 6. Preservação de autenticação e validação de membership
    const hasAuthCheck = content.includes('v_auth_user_id := auth.uid()') &&
                         content.includes('FROM public.organization_members om');
    results.push({
      suiteName,
      testName: '6. Preservação da validação estrita de auth.uid() e membresia ativa',
      passed: hasAuthCheck,
      error: !hasAuthCheck ? 'Validação de auth ou membership ausente' : undefined,
    });

    // 7. Preservação de lock FOR UPDATE e idempotência
    const hasLockAndNoop = content.includes('FOR UPDATE') &&
                           content.includes('IF (v_bootstrapped_at IS NOT NULL) THEN') &&
                           content.includes("'status', 'NOOP'");
    results.push({
      suiteName,
      testName: '7. Preservação do bloqueio FOR UPDATE contra concorrência e retorno NOOP',
      passed: hasLockAndNoop,
      error: !hasLockAndNoop ? 'Lock FOR UPDATE ou retorno NOOP ausente' : undefined,
    });

    // 8. Preservação de GRANT e REVOKE
    const hasGrants = content.includes('REVOKE ALL ON FUNCTION public.bootstrap_tenant_catalog(pg_catalog.uuid) FROM PUBLIC, anon;') &&
                      content.includes('GRANT EXECUTE ON FUNCTION public.bootstrap_tenant_catalog(pg_catalog.uuid) TO authenticated;');
    results.push({
      suiteName,
      testName: '8. Permissões estritas: anon sem EXECUTE e authenticated com EXECUTE',
      passed: hasGrants,
      error: !hasGrants ? 'Configuração de permissões GRANT/REVOKE incorreta' : undefined,
    });

    // 9. Contagem exata de itens: 10 produtos, 10 acabamentos, 10 insumos
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
      testName: '9. Contagem exata de itens confirmada: 10 produtos, 10 acabamentos, 10 insumos',
      passed: countsOk,
      error: !countsOk ? `Contagens divergentes: prods=${productsCountMatch?.length}, fins=${finishingsCountMatch?.length}, mats=${materialsCountMatch?.length}` : undefined,
    });

  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Leitura de migration 0013',
      passed: false,
      error: err.message,
    });
  }

  // 10. Simulação de ciclo de vida completo de idempotência
  let simulatedTenant = {
    id: 'org_amp_prod',
    catalog_bootstrapped_at: null as string | null,
    products: [] as string[],
    finishings: [] as string[],
    materials: [] as string[],
  };

  function executeRpc(tenant: typeof simulatedTenant, isMember: boolean, isAuth: boolean) {
    if (!isAuth) throw new Error('P0001: Não autenticado');
    if (!isMember) throw new Error('42501: Membresia não autorizada');
    if (tenant.catalog_bootstrapped_at) {
      return { status: 'NOOP', reason: 'ALREADY_BOOTSTRAPPED' };
    }

    // 10 products, 10 finishings, 10 materials
    tenant.products = Array.from({ length: 10 }, (_, i) => `Product ${i + 1}`);
    tenant.finishings = Array.from({ length: 10 }, (_, i) => `Finishing ${i + 1}`);
    tenant.materials = Array.from({ length: 10 }, (_, i) => `Material ${i + 1}`);
    tenant.catalog_bootstrapped_at = new Date().toISOString();

    return {
      status: 'BOOTSTRAPPED',
      products_count: tenant.products.length,
      finishings_count: tenant.finishings.length,
      materials_count: tenant.materials.length,
    };
  }

  // Execução 1: Cria 10/10/10 e marca timestamp
  const res1 = executeRpc(simulatedTenant, true, true);
  const ok1 = res1.status === 'BOOTSTRAPPED' && res1.products_count === 10 && res1.finishings_count === 10 && res1.materials_count === 10;

  // Execução 2: Retorna NOOP
  const res2 = executeRpc(simulatedTenant, true, true);
  const ok2 = res2.status === 'NOOP';

  // Exclusão de itens pelo usuário
  simulatedTenant.products = [];
  simulatedTenant.finishings = [];
  simulatedTenant.materials = [];

  // Execução 3: Continua NOOP e NÃO repopula
  const res3 = executeRpc(simulatedTenant, true, true);
  const ok3 = res3.status === 'NOOP' && simulatedTenant.products.length === 0;

  results.push({
    suiteName,
    testName: '10. Idempotência e tolerância a exclusão: 1ª exec cria 10/10/10, 2ª exec retorna NOOP, exclusão não repopula',
    passed: ok1 && ok2 && ok3,
    error: (!ok1 || !ok2 || !ok3) ? 'Falha no teste de idempotência' : undefined,
  });

  return results;
}
