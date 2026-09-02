import { runAllDomainTests } from './domain-integrity.test';
import { runPrexyonReadinessTests } from './prexyon-readiness.test';
import { runAllCustomerDomainTestsAsync } from './customer-domain.test';
import { runPricingEngineTestsAsync } from './pricing-engine.test';
import { runEnvironmentHonestyTests } from './environment-honesty.test';
import { runFinishingsEngineTests } from './finishings-engine.test';
import { runFinishingsCompatibilityTests } from './finishings-compatibility.test';
import { runPdfExportTests } from './pdf-export.test';
import { runAccessibilityResponsiveTests } from './accessibility-responsive.test';
import { runAuthFoundationTests } from './auth.test';
import { ssoIntegrationTests } from './sso-integration.test';
import { persistenceIntegrationTests } from './persistence-integration.test';
import { canonicalPermissionsMatrixTests } from './canonical-permissions-matrix.test';

async function main() {
  console.log('====================================');
  console.log('ORÇAGRAF - TESTES DE INTEGRIDADE E DOMÍNIO');
  console.log('====================================\n');

  const domain = runAllDomainTests();
  const prexyon = runPrexyonReadinessTests();
  const customer = await runAllCustomerDomainTestsAsync();
  const pricing = await runPricingEngineTestsAsync();
  const honesty = runEnvironmentHonestyTests();
  const finishings = runFinishingsEngineTests();
  const compatibility = runFinishingsCompatibilityTests();
  const pdfExport = runPdfExportTests();
  const a11yResponsive = runAccessibilityResponsiveTests();
  const auth = runAuthFoundationTests();

  const ssoResults = await Promise.all(
    ssoIntegrationTests.map(async (tc) => {
      const res = await tc.run();
      return {
        suiteName: 'Integração SSO Prexyon (Etapa 3.2)',
        testName: `${tc.num}. ${tc.name}`,
        passed: res.passed,
        error: res.error,
      };
    })
  );

  const persistenceResults = await Promise.all(
    persistenceIntegrationTests.map(async (tc) => {
      const res = await tc.run();
      return {
        suiteName: 'Persistência Supabase & Concorrência (Fase 16)',
        testName: `${tc.num}. ${tc.name}`,
        passed: res.passed,
        error: res.error,
      };
    })
  );

  const matrixResults = await Promise.all(
    canonicalPermissionsMatrixTests.map(async (tc) => {
      const res = await tc.run();
      return {
        suiteName: 'Matriz Canônica de Permissões (Prexyon -> OrçaGraf)',
        testName: `${tc.num}. ${tc.name}`,
        passed: res.passed,
        error: res.error,
      };
    })
  );

  const results = [
    ...domain.results,
    ...prexyon,
    ...customer,
    ...pricing,
    ...honesty,
    ...finishings,
    ...compatibility,
    ...pdfExport,
    ...a11yResponsive,
    ...auth,
    ...ssoResults,
    ...persistenceResults,
    ...matrixResults,
  ];
  const total = results.length;
  const passed = results.filter(result => result.passed).length;
  const failed = total - passed;

  results.forEach(res => {
    const statusIcon = res.passed ? '✅ [PASSOU]' : '❌ [FALHOU]';
    console.log(`${statusIcon} (${res.suiteName}) -> ${res.testName}`);
    if (res.error) {
      console.error(`   Erro: ${res.error}`);
    }
  });

  console.log('\n------------------------------------');
  console.log(`TOTAL: ${total} | APROVADOS: ${passed} | FALHAS: ${failed}`);
  console.log('------------------------------------');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('Todos os testes de integridade, status de orçamentos, multi-tenant, clientes, motor de cálculo e honestidade passaram com sucesso!\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Erro fatal ao executar suíte de testes:', err);
  process.exit(1);
});
