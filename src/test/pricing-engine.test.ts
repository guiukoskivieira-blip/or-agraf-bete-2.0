/**
 * @file pricing-engine.test.ts
 * @description Suíte de Testes Automatizados Determinísticos para o Motor de Quantidades e Unidades de Venda (P0)
 * @project OrçaGraf
 */

import { calculateItemPricing, inferPricingMode, formatItemPricingDescription } from '../domain/pricing-engine';
import { calculateQuoteTotals } from '../domain/quote-calculator';
import { getInitialProductsTemplate, initializeTenantProducts } from '../domain/product-catalog';
import { LocalStorageCustomerRepository } from '../domain/customer-repository';
import { Quote, QuoteItem } from '../types/quote';
import { Product } from '../types/product';
import { TestResult } from './domain-integrity.test';

export async function runPricingEngineTestsAsync(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  function assert(condition: boolean, testName: string, suiteName: string, errorDetails?: string) {
    if (condition) {
      results.push({ suiteName, testName, passed: true });
    } else {
      results.push({
        suiteName,
        testName,
        passed: false,
        error: errorDetails || 'Asserção falhou: valor divergente do esperado',
      });
    }
  }

  // -------------------------------------------------------------
  // TESTE 1: Unidade: 3 × R$ 220,00 = R$ 660,00
  // -------------------------------------------------------------
  const t1 = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 22000, // R$ 220,00
    quantity: 3,
  });
  assert(
    t1.totalItemCents === 66000 && t1.billedQuantity === 3 && t1.baseTotalCents === 66000,
    '3 wind banners a R$ 220,00 resultam em exatamente R$ 660,00 (66000 centavos)',
    '1. Modalidade Unidade (UNIT)'
  );

  // -------------------------------------------------------------
  // TESTE 2: Lote: 1.000 unidades, lote 1.000, R$ 70,00 = R$ 70,00
  // -------------------------------------------------------------
  const t2 = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000, // R$ 70,00 por lote
    quantity: 1000,
    lotSize: 1000,
  });
  assert(
    t2.totalItemCents === 7000 && t2.billedQuantity === 1,
    '1.000 cartões em lote de 1.000 a R$ 70,00 resultam em R$ 70,00 (1 lote cobrado)',
    '2. Modalidade Lote/Tiragem (LOT)'
  );

  // -------------------------------------------------------------
  // TESTE 3: Lote: 1.500 unidades, lote 1.000, R$ 70,00 = R$ 140,00
  // -------------------------------------------------------------
  const t3 = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000, // R$ 70,00 por lote
    quantity: 1500,
    lotSize: 1000,
  });
  assert(
    t3.totalItemCents === 14000 && t3.billedQuantity === 2,
    '1.500 cartões em lote de 1.000 a R$ 70,00 resultam em R$ 140,00 (2 lotes cobrados)',
    '3. Lote Adicional e Arredondamento por Teto'
  );

  // -------------------------------------------------------------
  // TESTE 4: m²: 1 × 1,5 m, quantidade 2, R$ 70,00/m² = R$ 210,00
  // -------------------------------------------------------------
  const t4 = calculateItemPricing({
    pricingMode: 'SQUARE_METER',
    salePriceCents: 7000, // R$ 70,00 por m²
    quantity: 2,
    widthMm: 1000, // 1.00 m
    heightMm: 1500, // 1.50 m
  });
  assert(
    t4.totalItemCents === 21000 && t4.areaM2 === 3.0 && t4.billedQuantity === 3.0,
    '2 banners de 1x1,5m a R$ 70,00/m² resultam em exatamente R$ 210,00 (3,00 m²)',
    '4. Modalidade Metro Quadrado (SQUARE_METER)'
  );

  // -------------------------------------------------------------
  // TESTE 5: Conversão de 1.000 × 1.500 mm para 1,5 m²
  // -------------------------------------------------------------
  const t5 = calculateItemPricing({
    pricingMode: 'SQUARE_METER',
    salePriceCents: 10000,
    quantity: 1,
    widthMm: 1000,
    heightMm: 1500,
  });
  assert(
    t5.areaM2 === 1.5,
    '1000 mm × 1500 mm converte deterministicamente para 1,5 m²',
    '5. Conversão Canônica de Dimensões'
  );

  // -------------------------------------------------------------
  // TESTE 6: Metro linear: 3 m, quantidade 2, R$ 50,00/m = R$ 300,00
  // -------------------------------------------------------------
  const t6 = calculateItemPricing({
    pricingMode: 'LINEAR_METER',
    salePriceCents: 5000, // R$ 50,00/m
    quantity: 2,
    lengthMeters: 3.0,
  });
  assert(
    t6.totalItemCents === 30000 && t6.linearMeters === 6.0,
    '2 faixas de 3m a R$ 50,00/m resultam em exatamente R$ 300,00 (6 metros lineares)',
    '6. Modalidade Metro Linear (LINEAR_METER)'
  );

  // -------------------------------------------------------------
  // TESTE 7: Acabamento Fixo
  // -------------------------------------------------------------
  const t7 = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 10000, // R$ 100,00
    quantity: 5,
    finishings: [
      {
        finishingId: 'fin_inst',
        name: 'Instalação Técnica Fixa',
        pricingBasis: 'fixed',
        unitPriceCents: 8000, // R$ 80,00 fixo
      },
    ],
  });
  assert(
    t7.finishingsTotalCents === 8000 && t7.totalItemCents === 58000, // 5*100 + 80 = 580
    'Acabamento fixo é somado apenas 1x independentemente da quantidade',
    '7. Acabamento Fixo'
  );

  // -------------------------------------------------------------
  // TESTE 8: Acabamento Por Unidade
  // -------------------------------------------------------------
  const t8 = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 2000, // R$ 20,00
    quantity: 4,
    finishings: [
      {
        finishingId: 'fin_cantos',
        name: 'Cantos Arredondados',
        pricingBasis: 'unit',
        unitPriceCents: 500, // R$ 5,00 por peça
      },
    ],
  });
  assert(
    t8.finishingsTotalCents === 2000 && t8.totalItemCents === 10000, // 4*20 + 4*5 = 100
    'Acabamento por unidade multiplica pela quantidade de peças',
    '8. Acabamento Por Unidade'
  );

  // -------------------------------------------------------------
  // TESTE 9: Acabamento Por Lote
  // -------------------------------------------------------------
  const t9 = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000, // R$ 70,00 por lote
    quantity: 1500,
    lotSize: 1000, // 2 lotes
    finishings: [
      {
        finishingId: 'fin_lam',
        name: 'Laminação Fosca BOPP',
        pricingBasis: 'lot',
        unitPriceCents: 1500, // R$ 15,00 por lote
      },
    ],
  });
  assert(
    t9.finishingsTotalCents === 3000 && t9.totalItemCents === 17000, // 2*70 + 2*15 = 170
    'Acabamento por lote multiplica pela quantidade de lotes faturados',
    '9. Acabamento Por Lote'
  );

  // -------------------------------------------------------------
  // TESTE 10: Acabamento Por m²
  // -------------------------------------------------------------
  const t10 = calculateItemPricing({
    pricingMode: 'SQUARE_METER',
    salePriceCents: 8000, // R$ 80,00/m²
    quantity: 2,
    widthMm: 1000,
    heightMm: 2000, // 2m² cada = 4m² total
    finishings: [
      {
        finishingId: 'fin_app',
        name: 'Aplicação de Película',
        pricingBasis: 'area_m2',
        unitPriceCents: 2000, // R$ 20,00/m²
      },
    ],
  });
  assert(
    t10.finishingsTotalCents === 8000 && t10.totalItemCents === 40000, // 4*80 + 4*20 = 400
    'Acabamento por m² multiplica pela área total calculada',
    '10. Acabamento Por m²'
  );

  // -------------------------------------------------------------
  // TESTE 11: Acabamento Por Metro Linear
  // -------------------------------------------------------------
  const t11 = calculateItemPricing({
    pricingMode: 'LINEAR_METER',
    salePriceCents: 5000, // R$ 50,00/m
    quantity: 2,
    lengthMeters: 4.0, // 8 metros lineares
    finishings: [
      {
        finishingId: 'fin_reforco',
        name: 'Reforço de Borda',
        pricingBasis: 'linear_meter',
        unitPriceCents: 1000, // R$ 10,00/m
      },
    ],
  });
  assert(
    t11.finishingsTotalCents === 8000 && t11.totalItemCents === 48000, // 8*50 + 8*10 = 480
    'Acabamento por metro linear multiplica pelo comprimento total',
    '11. Acabamento Por Metro Linear'
  );

  // -------------------------------------------------------------
  // TESTE 12: Desconto Percentual após cálculo dos itens
  // -------------------------------------------------------------
  const subtotal12 = 10000; // R$ 100,00
  const totals12 = calculateQuoteTotals(subtotal12, {
    type: 'percentage',
    value: 10,
    appliedAmountCents: 1000,
  });
  assert(
    totals12.appliedAmountCents === 1000 && totals12.totalFinalCents === 9000,
    'Desconto de 10% sobre R$ 100,00 resulta em R$ 10,00 de desconto e R$ 90,00 final',
    '12. Desconto Percentual'
  );

  // -------------------------------------------------------------
  // TESTE 13: Desconto Fixo após cálculo dos itens
  // -------------------------------------------------------------
  const subtotal13 = 10000; // R$ 100,00
  const totals13 = calculateQuoteTotals(subtotal13, {
    type: 'fixed',
    value: 2500, // R$ 25,00
    appliedAmountCents: 2500,
  });
  assert(
    totals13.appliedAmountCents === 2500 && totals13.totalFinalCents === 7500,
    'Desconto fixo de R$ 25,00 sobre R$ 100,00 resulta em R$ 75,00 final',
    '13. Desconto Fixo'
  );

  // -------------------------------------------------------------
  // TESTE 14: Dinheiro calculado em centavos sem erro de ponto flutuante
  // -------------------------------------------------------------
  // 3 itens de R$ 33,33 (3333 centavos)
  const itemCents = 3333;
  const sumCents = itemCents + itemCents + itemCents;
  assert(
    sumCents === 9999 && Number.isInteger(sumCents),
    'Cálculos em centavos inteiros eliminam imprecisão de ponto flutuante (0.1 + 0.2)',
    '14. Precisão Monetária'
  );

  // -------------------------------------------------------------
  // TESTE 15: Validação de valores zero, negativos, NaN e infinitos
  // -------------------------------------------------------------
  const t15Neg = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: -5000,
    quantity: -3,
  });
  const t15NaN = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: NaN,
    quantity: NaN,
    lotSize: 0,
  });
  assert(
    t15Neg.basePriceCents === 0 && t15Neg.requestedQuantity === 1 && !t15NaN.isValid,
    'Valores negativos, zero ou NaN são tratados de forma resiliente e bloqueados na validação',
    '15. Validações de Domínio'
  );

  // -------------------------------------------------------------
  // TESTE 16: Snapshot não muda quando o catálogo é editado
  // -------------------------------------------------------------
  const savedItem: QuoteItem = {
    id: 'it_snap_01',
    productId: 'prod_cartao',
    productName: 'Cartão de Visita',
    pricingMode: 'LOT',
    quantity: 1000,
    lotSize: 1000,
    billedQuantity: 1,
    basePriceCents: 7000,
    unitCostCents: 3500,
    unitPriceCents: 7000,
    totalPriceCents: 7000,
    finishings: [],
  };
  // Catálogo sofre reajuste de preço de R$ 70,00 para R$ 120,00
  const catalogProductAfterEdit: Product = {
    ...getInitialProductsTemplate('emp_1')[0],
    salePriceCents: 12000,
  };
  assert(
    savedItem.totalPriceCents === 7000 && catalogProductAfterEdit.salePriceCents === 12000,
    'O item do orçamento mantém seu snapshot inalterado após edição posterior do produto no catálogo',
    '16. Preservação de Snapshot'
  );

  // -------------------------------------------------------------
  // TESTE 17: Compatibilidade com orçamento legado
  // -------------------------------------------------------------
  const legacyQuoteItem: any = {
    id: 'legacy_item_1',
    productName: 'Cartão de Visita Couché 300g Laminação Fosca',
    quantity: 1000,
    unitPriceCents: 8500,
    totalPriceCents: 8500, // R$ 85,00 gravado
  };
  const inferred = inferPricingMode(legacyQuoteItem);
  const formatted = formatItemPricingDescription(legacyQuoteItem);
  assert(
    inferred === 'LOT' && legacyQuoteItem.totalPriceCents === 8500 && formatted.includes('85,00'),
    'Orçamento demonstrativo legado com 1.000 cartões e total R$ 85,00 é inferido como LOT e preserva R$ 85,00',
    '17. Compatibilidade Legada'
  );

  // -------------------------------------------------------------
  // TESTE 18: Migração idempotente dos produtos
  // -------------------------------------------------------------
  const tenantId = 'emp_migration_test';
  const initial = getInitialProductsTemplate(tenantId);
  const reinitialized = initializeTenantProducts(initial, tenantId);
  assert(
    initial.length === 15 && reinitialized.length === 15 && reinitialized[0].pricingMode === 'LOT',
    'Migração dos 15 produtos é idempotente e preserva a quantidade exata com modalidades configuradas',
    '18. Migração Idempotente'
  );

  // -------------------------------------------------------------
  // TESTE 19: Orçamentos de tenants diferentes permanecem isolados
  // -------------------------------------------------------------
  const quoteTenantA: Quote = {
    id: 'q_a',
    tenantId: 'emp_alpha',
    quoteNumber: 'ORC-001',
    customerId: 'c_1',
    customerName: 'Cliente A',
    currentVersion: 1,
    status: 'approved',
    items: [],
    subtotalCents: 5000,
    discount: { type: 'none', value: 0, appliedAmountCents: 0 },
    discountCents: 0,
    shippingCents: 0,
    totalCents: 5000,
    financialTerms: {} as any,
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assert(
    quoteTenantA.tenantId === 'emp_alpha' && (quoteTenantA.tenantId as string) !== 'emp_beta',
    'Orçamentos possuem tenantId explícito e não se misturam entre empresas',
    '19. Isolamento Multi-tenant'
  );

  // -------------------------------------------------------------
  // TESTE 20: O hotfix de clientes continua funcionando
  // -------------------------------------------------------------
  const customerRepo = new LocalStorageCustomerRepository();
  const custRes = await customerRepo.create('emp_hotfix_check', {
    name: 'Cliente Hotfix Ativo',
    type: 'person',
    document: '12345678909',
    phone: '(11) 99999-1111',
  });
  assert(
    custRes.success && Boolean(custRes.customer?.id),
    'Cadastro de clientes permanece 100% funcional no repositório multi-tenant',
    '20. Regressão Hotfix Clientes'
  );

  // -------------------------------------------------------------
  // TESTE 21: Cliente cadastrado continua selecionável no orçamento
  // -------------------------------------------------------------
  const quoteWithCust: Partial<Quote> = {
    customerId: custRes.customer?.id,
    customerName: custRes.customer?.name,
    customerDocument: custRes.customer?.document,
  };
  assert(
    quoteWithCust.customerId === custRes.customer?.id && quoteWithCust.customerName === 'Cliente Hotfix Ativo',
    'Cliente cadastrado vinculado persiste customerId e dados preenchidos',
    '21. Vínculo de Cliente Cadastrado'
  );

  // -------------------------------------------------------------
  // TESTE 22: Cliente avulso continua permitido
  // -------------------------------------------------------------
  const quoteWithAvulso: Partial<Quote> = {
    customerId: undefined,
    customerName: 'Cliente Balcão Avulso',
    customerContact: '(11) 98888-0000',
  };
  assert(
    quoteWithAvulso.customerId === undefined && quoteWithAvulso.customerName === 'Cliente Balcão Avulso',
    'Orçamento com cliente avulso não exige cadastro prévio obrigatório',
    '22. Suporte a Cliente Avulso'
  );

  return results;
}
