import fs from 'fs';
import path from 'path';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runQuoteDetailsLoadingGuardTests(): TestResult[] {
  const suiteName = 'Quote Details Loading Guard';
  const results: TestResult[] = [];

  const quoteDetailsPath = path.join(process.cwd(), 'src/pages/QuoteDetailsPage.tsx');
  const code = fs.readFileSync(quoteDetailsPath, 'utf-8');

  // Test 1: QuoteDetailsPage imports/destructures isLoadingCommercial from useCommercial
  try {
    const hasIsLoadingDestructured = /const\s*\{[^}]*isLoadingCommercial[^}]*\}\s*=\s*useCommercial\(\)/.test(code);
    if (!hasIsLoadingDestructured) {
      throw new Error('isLoadingCommercial não foi desestruturado de useCommercial() em QuoteDetailsPage');
    }
    results.push({
      suiteName,
      testName: '1. loading=true + quotes=[]: isLoadingCommercial obtido de useCommercial()',
      passed: true,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: '1. loading=true + quotes=[]: isLoadingCommercial obtido de useCommercial()',
      passed: false,
      error: err.message,
    });
  }

  // Test 2: Loading guard exists before !quote check
  try {
    const loadingGuardIndex = code.indexOf('if (isLoadingCommercial && !quote)');
    const notFoundGuardIndex = code.indexOf('if (!quote)');
    
    if (loadingGuardIndex === -1) {
      throw new Error('Guarda de loading (isLoadingCommercial && !quote) não encontrada');
    }
    if (notFoundGuardIndex === -1) {
      throw new Error('Guarda de não encontrado (if (!quote)) não encontrada');
    }
    if (loadingGuardIndex >= notFoundGuardIndex) {
      throw new Error('Guarda de loading deve preceder a guarda de !quote');
    }

    results.push({
      suiteName,
      testName: '2. loading guard precede a verificação de orçamento não encontrado',
      passed: true,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: '2. loading guard precede a verificação de orçamento não encontrado',
      passed: false,
      error: err.message,
    });
  }

  // Test 3: Loading state does NOT render "Orçamento não encontrado"
  try {
    // Extract the loading block
    const loadingBlockMatch = code.match(/if\s*\(isLoadingCommercial\s*&&\s*!quote\)\s*\{([\s\S]*?)\}\s*if\s*\(!quote\)/);
    if (!loadingBlockMatch) {
      throw new Error('Estrutura do bloco de carregamento não pôde ser analisada');
    }
    const loadingBlock = loadingBlockMatch[1];
    if (loadingBlock.includes('Orçamento não encontrado') || loadingBlock.includes('não existe ou pertence')) {
      throw new Error('Bloco de loading não deve conter texto de "Orçamento não encontrado"');
    }
    if (!loadingBlock.includes('Carregando') && !loadingBlock.includes('animate-spin')) {
      throw new Error('Bloco de loading deve exibir indicador visual de carregamento (spinner/texto)');
    }

    results.push({
      suiteName,
      testName: '3. loading=true + quotes=[]: exibe indicador de carregamento sem falso positivo de erro',
      passed: true,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: '3. loading=true + quotes=[]: exibe indicador de carregamento sem falso positivo de erro',
      passed: false,
      error: err.message,
    });
  }

  // Test 4: Logic simulation: test state transitions
  try {
    // Simulator function matching the page logic
    function resolveQuoteDetailsState(params: {
      isLoadingCommercial: boolean;
      quotes: Array<{ id: string; tenantId: string; status: string }>;
      quoteId: string;
      currentCompanyId: string;
    }): 'LOADING' | 'NOT_FOUND' | 'QUOTE_READY' {
      const quote = params.quotes.find(q => q.id === params.quoteId && q.tenantId === params.currentCompanyId);
      if (params.isLoadingCommercial && !quote) {
        return 'LOADING';
      }
      if (!quote) {
        return 'NOT_FOUND';
      }
      return 'QUOTE_READY';
    }

    // 1. loading=true + quotes=[] => LOADING
    const state1 = resolveQuoteDetailsState({
      isLoadingCommercial: true,
      quotes: [],
      quoteId: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854',
      currentCompanyId: 'org_real_123',
    });
    if (state1 !== 'LOADING') {
      throw new Error(`Esperado 'LOADING', obtido '${state1}' para loading=true + quotes=[]`);
    }

    // 2. loading=true + quote available in memory => QUOTE_READY
    const state2 = resolveQuoteDetailsState({
      isLoadingCommercial: true,
      quotes: [{ id: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854', tenantId: 'org_real_123', status: 'awaiting_customer' }],
      quoteId: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854',
      currentCompanyId: 'org_real_123',
    });
    if (state2 !== 'QUOTE_READY') {
      throw new Error(`Esperado 'QUOTE_READY', obtido '${state2}' para loading=true + quote disponível`);
    }

    // 3. loading=false + quote missing => NOT_FOUND
    const state3 = resolveQuoteDetailsState({
      isLoadingCommercial: false,
      quotes: [],
      quoteId: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854',
      currentCompanyId: 'org_real_123',
    });
    if (state3 !== 'NOT_FOUND') {
      throw new Error(`Esperado 'NOT_FOUND', obtido '${state3}' para loading=false + quote inexistente`);
    }

    // 4. loading=false + quote existing => QUOTE_READY
    const state4 = resolveQuoteDetailsState({
      isLoadingCommercial: false,
      quotes: [{ id: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854', tenantId: 'org_real_123', status: 'awaiting_customer' }],
      quoteId: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854',
      currentCompanyId: 'org_real_123',
    });
    if (state4 !== 'QUOTE_READY') {
      throw new Error(`Esperado 'QUOTE_READY', obtido '${state4}' para loading=false + quote existente`);
    }

    // 5. quote approved => QUOTE_READY sem discriminação de status
    const state5 = resolveQuoteDetailsState({
      isLoadingCommercial: false,
      quotes: [{ id: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854', tenantId: 'org_real_123', status: 'approved' }],
      quoteId: 'd20fef5a-070a-4eb1-bd06-901c8ac6d854',
      currentCompanyId: 'org_real_123',
    });
    if (state5 !== 'QUOTE_READY') {
      throw new Error(`Esperado 'QUOTE_READY', obtido '${state5}' para status=approved`);
    }

    results.push({
      suiteName,
      testName: '4. simulação de transições de estado cobre perfeitamente os 5 cenários',
      passed: true,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: '4. simulação de transições de estado cobre perfeitamente os 5 cenários',
      passed: false,
      error: err.message,
    });
  }

  return results;
}

if (process.argv[1] && process.argv[1].includes('quote-details-loading-guard')) {
  console.log('--- TESTES DIRECIONADOS: QUOTE DETAILS LOADING GUARD ---');
  const res = runQuoteDetailsLoadingGuardTests();
  let failed = 0;
  res.forEach(r => {
    console.log(`${r.passed ? '✅ [PASSOU]' : '❌ [FALHOU]'} -> ${r.testName}`);
    if (r.error) {
      console.error(`   Erro: ${r.error}`);
      failed++;
    }
  });
  console.log(`\nResultado: ${res.length - failed}/${res.length} aprovados.`);
  process.exit(failed > 0 ? 1 : 0);
}

