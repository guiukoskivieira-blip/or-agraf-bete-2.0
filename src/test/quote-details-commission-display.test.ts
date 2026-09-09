import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { formatCommissionForDisplay } from '../pages/QuoteDetailsPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

const normalizeSpaces = (value: string | null): string | null => value?.replace(/\s/g, ' ') ?? null;

export function runQuoteDetailsCommissionDisplayTests(): TestResult[] {
  const suiteName = 'Exibição de Comissão no Detalhe do Orçamento';
  const cases: Array<{ testName: string; actual: string | null; expected: string | null }> = [
    {
      testName: '1. deriva visualmente R$ 11,25 quando rate = 5, amount = null e total = 22500',
      actual: formatCommissionForDisplay(5, null, 22500),
      expected: '5% — R$ 11,25',
    },
    {
      testName: '2. prioriza amount persistido e exibe percentual quando ambos existem',
      actual: formatCommissionForDisplay(5, 1125, 99999),
      expected: '5% — R$ 11,25',
    },
    {
      testName: '3. exibe somente o valor quando apenas amount existe',
      actual: formatCommissionForDisplay(null, 1125, 22500),
      expected: 'R$ 11,25',
    },
    {
      testName: '4. não exibe comissão quando rate e amount são ausentes',
      actual: formatCommissionForDisplay(null, null, 22500),
      expected: null,
    },
  ];

  const results: TestResult[] = cases.map(testCase => {
    const passed = normalizeSpaces(testCase.actual) === testCase.expected;
    return {
      suiteName,
      testName: testCase.testName,
      passed,
      error: passed ? undefined : `Esperado ${String(testCase.expected)}, encontrado ${String(testCase.actual)}`,
    };
  });

  const pagePath = path.resolve(__dirname, '../pages/QuoteDetailsPage.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf-8');
  const preservedBindings = [
    'formatCentsToBRL(quote.subtotalCents)',
    'formatCentsToBRL(discountCents)',
    'formatCentsToBRL(quote.totalCents)',
    "quote.sellerName || quote.salespersonName || 'Vendas Geral'",
  ];
  const missingBindings = preservedBindings.filter(binding => !pageSource.includes(binding));

  results.push({
    suiteName,
    testName: '5. subtotal, desconto, total e vendedor continuam com os mesmos bindings',
    passed: missingBindings.length === 0,
    error: missingBindings.length === 0 ? undefined : `Bindings ausentes: ${missingBindings.join(', ')}`,
  });

  return results;
}

if (process.argv[1]?.includes('quote-details-commission-display')) {
  const results = runQuoteDetailsCommissionDisplayTests();
  const failed = results.filter(result => !result.passed);

  results.forEach(result => {
    console.log(`${result.passed ? 'PASSOU' : 'FALHOU'}: ${result.testName}`);
    if (result.error) console.error(`  ${result.error}`);
  });

  console.log(`Resultado: ${results.length - failed.length}/${results.length} aprovados.`);
  process.exit(failed.length > 0 ? 1 : 0);
}
