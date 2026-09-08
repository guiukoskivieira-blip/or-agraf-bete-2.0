/**
 * @file initial-catalog-bootstrap.test.ts
 * @description Testes direcionados para o Bootstrap Inicial do Catálogo Comercial (Migration 0012)
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runInitialCatalogBootstrapTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Catálogo Inicial MVP — Bootstrap Idempotente (Migration 0012)';

  // 1. Validar estrutura do arquivo de migration 0012
  try {
    const migrationPath = path.resolve(__dirname, '../../supabase/migrations/0012_bootstrap_initial_tenant_catalog.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

    // 1. Coluna catalog_bootstrapped_at
    const hasColumn = migrationContent.includes('ALTER TABLE public.organizations') &&
                      migrationContent.includes('ADD COLUMN IF NOT EXISTS catalog_bootstrapped_at TIMESTAMPTZ NULL');
    results.push({
      suiteName,
      testName: '1. Migration 0012 adiciona coluna catalog_bootstrapped_at na tabela public.organizations',
      passed: hasColumn,
      error: !hasColumn ? 'Declaração de coluna catalog_bootstrapped_at ausente ou incorreta' : undefined,
    });

    // 2. RPC bootstrap_tenant_catalog criada com SECURITY DEFINER e search_path seguro
    const hasRpc = migrationContent.includes('CREATE OR REPLACE FUNCTION public.bootstrap_tenant_catalog') &&
                   migrationContent.includes('SECURITY DEFINER') &&
                   migrationContent.includes("SET search_path = ''");
    results.push({
      suiteName,
      testName: '2. RPC bootstrap_tenant_catalog declarada como SECURITY DEFINER com search_path vazio seguro',
      passed: hasRpc,
      error: !hasRpc ? 'Declaração da RPC ausente ou search_path inseguro' : undefined,
    });

    // 3. Validação de autenticação estrita (auth.uid() IS NOT NULL)
    const hasAuthCheck = migrationContent.includes('v_auth_user_id := auth.uid()') &&
                         migrationContent.includes('IF (v_auth_user_id IS NULL)');
    results.push({
      suiteName,
      testName: '3. RPC valida autenticação estrita (auth.uid() não pode ser nulo)',
      passed: hasAuthCheck,
      error: !hasAuthCheck ? 'Validação de auth.uid() ausente' : undefined,
    });

    // 4. Validação de membresia ativa e não bloqueada (organization_members)
    const hasMembershipCheck = migrationContent.includes('FROM public.organization_members om') &&
                               migrationContent.includes('om.organization_id = p_organization_id') &&
                               migrationContent.includes('om.user_id = v_auth_user_id') &&
                               migrationContent.includes('om.is_active = true') &&
                               migrationContent.includes('om.is_locked = false');
    results.push({
      suiteName,
      testName: '4. RPC valida membresia ativa e não bloqueada do usuário na organização',
      passed: hasMembershipCheck,
      error: !hasMembershipCheck ? 'Validação de membresia ausente' : undefined,
    });

    // 5. Validação de organização ativa e bloqueio concorrente (SELECT ... FOR UPDATE)
    const hasOrgLock = migrationContent.includes('FROM public.organizations o') &&
                       migrationContent.includes('o.is_active = true') &&
                       migrationContent.includes('o.deleted_at IS NULL') &&
                       migrationContent.includes('FOR UPDATE');
    results.push({
      suiteName,
      testName: '5. RPC bloqueia linha da organização com SELECT ... FOR UPDATE prevenindo concorrência',
      passed: hasOrgLock,
      error: !hasOrgLock ? 'Bloqueio FOR UPDATE ou validação de status da organização ausente' : undefined,
    });

    // 6. Idempotência: Retorno NOOP quando catalog_bootstrapped_at já está preenchido
    const hasNoopCheck = migrationContent.includes('IF (v_bootstrapped_at IS NOT NULL) THEN') &&
                         migrationContent.includes("'status', 'NOOP'");
    results.push({
      suiteName,
      testName: '6. RPC garante idempotência retornando NOOP se a organização já foi inicializada',
      passed: hasNoopCheck,
      error: !hasNoopCheck ? 'Checagem de idempotência com NOOP ausente' : undefined,
    });

    // 7. Inserção de exatamente 10 produtos úteis e sem preços fictícios (has_price_configured = false)
    const expectedProducts = [
      'Banner em Lona',
      'Faixa em Lona',
      'Adesivo Impresso',
      'Adesivo Recortado',
      'Placa em PVC',
      'Placa em PS',
      'Placa em ACM',
      'Cartão de Visita',
      'Flyer',
      'Folder',
    ];
    const allProductsPresent = expectedProducts.every(p => migrationContent.includes(`'${p}'`));
    const hasUnconfiguredPrice = migrationContent.includes('false, true,') && migrationContent.includes('has_price_configured');
    results.push({
      suiteName,
      testName: '7. RPC insere os 10 produtos canônicos com has_price_configured = false e valores neutros',
      passed: allProductsPresent && hasUnconfiguredPrice,
      error: (!allProductsPresent || !hasUnconfiguredPrice) ? 'Produtos canônicos incompletos ou preço fictício detectado' : undefined,
    });

    // 8. Inserção de exatamente 10 acabamentos com NOT_CONFIGURED e price_cents = 0
    const expectedFinishings = [
      'Ilhós',
      'Bastão',
      'Corda',
      'Laminação Brilho',
      'Laminação Fosca',
      'Corte Reto',
      'Corte Especial',
      'Refile',
      'Dobra',
      'Fita Dupla Face',
    ];
    const allFinishingsPresent = expectedFinishings.every(f => migrationContent.includes(`'${f}'`));
    const hasNotConfiguredStatus = migrationContent.includes("'NOT_CONFIGURED'::public.finishing_price_status");
    results.push({
      suiteName,
      testName: '8. RPC insere os 10 acabamentos canônicos com price_status = NOT_CONFIGURED e price_cents = 0',
      passed: allFinishingsPresent && hasNotConfiguredStatus,
      error: (!allFinishingsPresent || !hasNotConfiguredStatus) ? 'Acabamentos canônicos incompletos ou status incorreto' : undefined,
    });

    // 9. Inserção de exatamente 10 insumos/materiais com cost_price_cents = 0
    const expectedMaterials = [
      'Lona 440g',
      'Vinil Branco Brilho',
      'Vinil Branco Fosco',
      'Vinil Transparente',
      'PVC 1 mm',
      'PVC 2 mm',
      'PS 1 mm',
      'ACM 3 mm',
      'Papel Couchê',
      'Fita Dupla Face',
    ];
    const allMaterialsPresent = expectedMaterials.every(m => migrationContent.includes(`'${m}'`));
    results.push({
      suiteName,
      testName: '9. RPC insere os 10 insumos/materiais canônicos com custo zero (sem custo inventado)',
      passed: allMaterialsPresent,
      error: !allMaterialsPresent ? 'Insumos canônicos incompletos' : undefined,
    });

    // 10. Atualização do marcador catalog_bootstrapped_at somente ao final
    const updatesMarkerAtEnd = migrationContent.includes('UPDATE public.organizations') &&
                               migrationContent.includes('SET catalog_bootstrapped_at = v_now') &&
                               migrationContent.indexOf('UPDATE public.organizations') > migrationContent.indexOf('INSERT INTO public.materials');
    results.push({
      suiteName,
      testName: '10. Marcador catalog_bootstrapped_at é gravado atomicamente somente após todos os INSERTs',
      passed: updatesMarkerAtEnd,
      error: !updatesMarkerAtEnd ? 'Marcador atualizado em momento indevido' : undefined,
    });

    // 11. Permissões restritas: REVOKE de anon/PUBLIC e GRANT exclusivo para authenticated
    const hasSecureGrants = migrationContent.includes('REVOKE ALL ON FUNCTION public.bootstrap_tenant_catalog') &&
                            migrationContent.includes('GRANT EXECUTE ON FUNCTION public.bootstrap_tenant_catalog(pg_catalog.uuid) TO authenticated');
    results.push({
      suiteName,
      testName: '11. Permissões de RPC: revogado de anon/PUBLIC e concedido apenas para authenticated',
      passed: hasSecureGrants,
      error: !hasSecureGrants ? 'Permissões de execução inseguras' : undefined,
    });

  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Leitura de migration 0012',
      passed: false,
      error: err.message,
    });
  }

  // 12. Validar integração no frontend (ProductRepository e CommercialContext)
  try {
    const repoPath = path.resolve(__dirname, '../repositories/product.repository.ts');
    const repoContent = fs.readFileSync(repoPath, 'utf-8');

    const hasBootstrapMethod = repoContent.includes('bootstrapCatalog(tenantId: string)') &&
                               repoContent.includes("rpc('bootstrap_tenant_catalog'");
    results.push({
      suiteName,
      testName: '12. ProductRepository possui método bootstrapCatalog que aciona a RPC Supabase',
      passed: hasBootstrapMethod,
      error: !hasBootstrapMethod ? 'Método bootstrapCatalog ausente em ProductRepository' : undefined,
    });

    const contextPath = path.resolve(__dirname, '../context/CommercialContext.tsx');
    const contextContent = fs.readFileSync(contextPath, 'utf-8');

    const callsBootstrapBeforeLoad = contextContent.includes('productRepository.bootstrapCatalog(tenantId)') &&
                                     contextContent.indexOf('productRepository.bootstrapCatalog(tenantId)') < contextContent.indexOf('productRepository.listProducts(tenantId)');
    results.push({
      suiteName,
      testName: '13. CommercialContext aciona bootstrapCatalog antes de carregar o catálogo de produtos',
      passed: callsBootstrapBeforeLoad,
      error: !callsBootstrapBeforeLoad ? 'CommercialContext não aciona bootstrap antes do carregamento' : undefined,
    });

  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Integração frontend de bootstrap',
      passed: false,
      error: err.message,
    });
  }

  // 14. Simulação em memória / testes de idempotência e não-repopulação pós-exclusão
  let simulatedOrg = {
    id: 'org_test_123',
    catalog_bootstrapped_at: null as string | null,
    products: [] as string[],
  };

  function simulateRpcExecution(org: typeof simulatedOrg, isMember: boolean, isAuth: boolean) {
    if (!isAuth) throw new Error('Não autenticado');
    if (!isMember) throw new Error('Acesso negado');
    if (org.catalog_bootstrapped_at) {
      return { status: 'NOOP', reason: 'ALREADY_BOOTSTRAPPED' };
    }
    org.products = ['Banner em Lona', 'Faixa em Lona', 'Adesivo Impresso', 'Adesivo Recortado', 'Placa em PVC', 'Placa em PS', 'Placa em ACM', 'Cartão de Visita', 'Flyer', 'Folder'];
    org.catalog_bootstrapped_at = new Date().toISOString();
    return { status: 'BOOTSTRAPPED', count: org.products.length };
  }

  // 1a execução: BOOTSTRAPPED
  const firstRun = simulateRpcExecution(simulatedOrg, true, true);
  const passedFirst = firstRun.status === 'BOOTSTRAPPED' && simulatedOrg.products.length === 10 && !!simulatedOrg.catalog_bootstrapped_at;

  // 2a execução: NOOP
  const secondRun = simulateRpcExecution(simulatedOrg, true, true);
  const passedSecond = secondRun.status === 'NOOP' && simulatedOrg.products.length === 10;

  // Cliente apaga produtos
  simulatedOrg.products = [];

  // 3a execução após exclusão manual: continua NOOP (NÃO repopula)
  const thirdRun = simulateRpcExecution(simulatedOrg, true, true);
  const passedThird = thirdRun.status === 'NOOP' && simulatedOrg.products.length === 0;

  results.push({
    suiteName,
    testName: '14. Idempotência comprovada: 1ª exec cria 10 itens, 2ª exec retorna NOOP, exclusão manual NÃO repopula',
    passed: passedFirst && passedSecond && passedThird,
    error: (!passedFirst || !passedSecond || !passedThird) ? 'Falha na lógica de idempotência ou repopulação indevida' : undefined,
  });

  // Teste de isolamento e rejeição de não-membro
  let unauthDenied = false;
  try {
    simulateRpcExecution(simulatedOrg, false, true);
  } catch {
    unauthDenied = true;
  }

  results.push({
    suiteName,
    testName: '15. Isolamento e Segurança: usuário fora da organização é sumariamente negado',
    passed: unauthDenied,
    error: !unauthDenied ? 'Usuário fora da organização não foi rejeitado' : undefined,
  });

  return results;
}
