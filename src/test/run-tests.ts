import { runAllDomainTests } from './domain-integrity.test';
import { runPrexyonReadinessTests } from './prexyon-readiness.test';

console.log('====================================');
console.log('ORÇAGRAF - TESTES DE INTEGRIDADE E DOMÍNIO');
console.log('====================================\n');

const domain = runAllDomainTests();
const results = [...domain.results, ...runPrexyonReadinessTests()];
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
  console.log('Todos os testes de integridade, status de orçamentos e multi-tenant passaram com sucesso!\n');
  process.exit(0);
}
