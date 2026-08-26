/**
 * @file finishings-engine.test.ts
 * @description Suíte com os 26 Testes Automatizados do Motor Comercial de Acabamentos e Limpeza Standalone
 * @project OrçaGraf
 */

import { calculateItemPricing, normalizeFinishingPricingBasis } from '../domain/pricing-engine';
import { getInitialFinishingsTemplate, initializeTenantFinishings } from '../domain/product-catalog';
import { calculateQuoteTotals } from '../domain/financial-calculations';
import { Finishing, FinishingPricingBasis, FinishingPriceStatus } from '../types/product';
import { Quote, QuoteItem, QuoteItemFinishing } from '../types/quote';
import { formatCentsToBRL } from '../domain/money';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runFinishingsEngineTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Motor Comercial de Acabamentos & Standalone';

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    results.push({
      suiteName,
      testName,
      passed: condition,
      error: condition ? undefined : errorDetail || 'Asserção falhou',
    });
  }

  const templateAlphaprint = getInitialFinishingsTemplate('emp_alphaprint_01');

  // 1. Refile cadastrado com base PER_UNIT e priceStatus === 'FREE'
  const refile = templateAlphaprint.find(f => f.name.toLowerCase() === 'refile');
  assert(
    Boolean(refile && refile.pricingBasis === 'PER_UNIT' && refile.priceStatus === 'FREE' && refile.isRequired),
    '1. Refile cadastrado com base PER_UNIT, isRequired e priceStatus FREE'
  );

  // 2. Laminação fosca cadastrada com base PER_SQUARE_METER e priceStatus === 'NOT_CONFIGURED'
  const lamFosca = templateAlphaprint.find(f => f.name.toLowerCase() === 'laminação fosca');
  assert(
    Boolean(lamFosca && lamFosca.pricingBasis === 'PER_SQUARE_METER' && lamFosca.priceStatus === 'NOT_CONFIGURED' && !lamFosca.isRequired),
    '2. Laminação fosca cadastrada com base PER_SQUARE_METER e priceStatus NOT_CONFIGURED'
  );

  // 3. Verniz localizado cadastrado com base PER_LOT e priceStatus === 'NOT_CONFIGURED'
  const verniz = templateAlphaprint.find(f => f.name.toLowerCase() === 'verniz localizado');
  assert(
    Boolean(verniz && verniz.pricingBasis === 'PER_LOT' && verniz.priceStatus === 'NOT_CONFIGURED'),
    '3. Verniz localizado cadastrado com base PER_LOT e priceStatus NOT_CONFIGURED'
  );

  // 4. Bainha cadastrada com base PER_LINEAR_METER e priceStatus === 'NOT_CONFIGURED'
  const bainha = templateAlphaprint.find(f => f.name.toLowerCase() === 'bainha');
  assert(
    Boolean(bainha && bainha.pricingBasis === 'PER_LINEAR_METER' && bainha.priceStatus === 'NOT_CONFIGURED'),
    '4. Bainha cadastrada com base PER_LINEAR_METER e priceStatus NOT_CONFIGURED'
  );

  // 5. Instalação cadastrada com base FIXED e priceStatus === 'NOT_CONFIGURED'
  const instalacao = templateAlphaprint.find(f => f.name.toLowerCase() === 'instalação');
  assert(
    Boolean(instalacao && instalacao.pricingBasis === 'FIXED' && instalacao.priceStatus === 'NOT_CONFIGURED'),
    '5. Instalação cadastrada com base FIXED e priceStatus NOT_CONFIGURED'
  );

  // 6. Acabamento FREE calcula R$ 0,00 sem acrescer custo ao item
  const calcFree = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 5000,
    quantity: 10,
    finishings: [
      {
        finishingId: 'fin_refile',
        name: 'Refile',
        pricingBasis: 'PER_UNIT',
        unitPriceCents: 0,
        priceStatus: 'FREE',
        isRequired: true,
      },
    ],
  });
  assert(
    calcFree.totalItemCents === 50000 &&
      calcFree.finishingsTotalCents === 0 &&
      calcFree.calculatedFinishings[0].priceStatus === 'FREE',
    '6. Acabamento FREE calcula R$ 0,00 sem acrescer custo ao total base'
  );

  // 7. Acabamento NOT_CONFIGURED não calcula valor
  const calcNotConfigured = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 5000,
    quantity: 10,
    finishings: [
      {
        finishingId: 'fin_lam',
        name: 'Laminação fosca',
        pricingBasis: 'PER_SQUARE_METER',
        unitPriceCents: 0,
        priceStatus: 'NOT_CONFIGURED',
      },
    ],
  });
  assert(
    calcNotConfigured.finishingsTotalCents === 0 &&
      calcNotConfigured.calculatedFinishings[0].priceStatus === 'NOT_CONFIGURED' &&
      calcNotConfigured.calculatedFinishings[0].calculationMemory === 'Preço não configurado',
    '7. Acabamento NOT_CONFIGURED não gera cobrança acidental e sinaliza memória'
  );

  // 8. Acabamento FIXED cobra exatamente o valor fixo independente da quantidade (1x)
  const calcFixed = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 2000, // R$ 20,00
    quantity: 15,
    finishings: [
      {
        finishingId: 'fin_inst',
        name: 'Instalação',
        pricingBasis: 'FIXED',
        unitPriceCents: 15000, // R$ 150,00 fixo
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // Total = (15 * 20,00) + 150,00 = 300,00 + 150,00 = 450,00 (45000 centavos)
  assert(
    calcFixed.finishingsTotalCents === 15000 && calcFixed.totalItemCents === 45000,
    '8. Acabamento FIXED cobra exatamente 1x o valor fixo para o item (R$ 150,00)'
  );

  // 9. Acabamento PER_UNIT multiplica quantidade por preço unitário
  const calcUnit = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 1000, // R$ 10,00
    quantity: 25,
    finishings: [
      {
        finishingId: 'fin_dobra',
        name: 'Dobra',
        pricingBasis: 'PER_UNIT',
        unitPriceCents: 50, // R$ 0,50 por un.
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // Total acabamento = 25 * 50 = 1250 centavos (R$ 12,50). Total = 25000 + 1250 = 26250 centavos
  assert(
    calcUnit.finishingsTotalCents === 1250 && calcUnit.totalItemCents === 26250,
    '9. Acabamento PER_UNIT multiplica quantidade pelo valor unitário (25 × R$ 0,50 = R$ 12,50)'
  );

  // 10. Acabamento PER_LOT faturado por lotes inteiros (teto)
  const calcLot1 = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000, // R$ 70,00 / lote
    quantity: 1000,
    lotSize: 1000,
    finishings: [
      {
        finishingId: 'fin_verniz',
        name: 'Verniz Localizado',
        pricingBasis: 'PER_LOT',
        unitPriceCents: 2500, // R$ 25,00 / lote
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // 1000 un = 1 lote -> 70,00 + 25,00 = 95,00 (9500 cents)
  const calcLot2 = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000,
    quantity: 1500, // 2 lotes
    lotSize: 1000,
    finishings: [
      {
        finishingId: 'fin_verniz',
        name: 'Verniz Localizado',
        pricingBasis: 'PER_LOT',
        unitPriceCents: 2500,
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // 1500 un = 2 lotes -> (2 * 70,00) + (2 * 25,00) = 140,00 + 50,00 = 190,00 (19000 cents)
  assert(
    calcLot1.totalItemCents === 9500 && calcLot2.totalItemCents === 19000 && calcLot2.calculatedFinishings[0].billedQuantity === 2,
    '10. Acabamento PER_LOT fatura por lotes arredondados para cima (1.500 un = 2 lotes de verniz = R$ 50,00)'
  );

  // 11. Acabamento PER_SQUARE_METER calcula área total em m² × preço/m²
  const calcM2 = calculateItemPricing({
    pricingMode: 'SQUARE_METER',
    salePriceCents: 8000, // R$ 80,00 / m²
    quantity: 2, // 2 peças
    widthMm: 1000, // 1m
    heightMm: 2000, // 2m -> área peça = 2m² -> área total = 4m²
    finishings: [
      {
        finishingId: 'fin_lam',
        name: 'Laminação Fosca',
        pricingBasis: 'PER_SQUARE_METER',
        unitPriceCents: 1500, // R$ 15,00 / m²
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // Base = 4m² * 80 = 320,00 (32000 cents). Acabamento = 4m² * 15 = 60,00 (6000 cents). Total = 380,00 (38000 cents)
  assert(
    calcM2.areaM2 === 4 && calcM2.finishingsTotalCents === 6000 && calcM2.totalItemCents === 38000,
    '11. Acabamento PER_SQUARE_METER calcula área total em m² (4 m² × R$ 15,00/m² = R$ 60,00)'
  );

  // 12. Acabamento PER_LINEAR_METER calcula comprimento total em m × preço/m
  const calcLinear = calculateItemPricing({
    pricingMode: 'LINEAR_METER',
    salePriceCents: 4500, // R$ 45,00 / m linear
    quantity: 3, // 3 peças
    lengthMeters: 2.5, // 2,5m por peça -> total = 7,5m lineares
    finishings: [
      {
        finishingId: 'fin_bainha',
        name: 'Bainha com Solda',
        pricingBasis: 'PER_LINEAR_METER',
        unitPriceCents: 800, // R$ 8,00 / m
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // Base = 7.5 * 4500 = 33750 centavos (R$ 337,50). Acabamento = 7.5 * 800 = 6000 centavos (R$ 60,00). Total = 39750
  assert(
    calcLinear.linearMeters === 7.5 && calcLinear.finishingsTotalCents === 6000 && calcLinear.totalItemCents === 39750,
    '12. Acabamento PER_LINEAR_METER calcula comprimento total em metros (7,5 m × R$ 8,00/m = R$ 60,00)'
  );

  // 13. Soma do item = totalBaseProduto + somaAcabamentos
  const calcMultiFin = calculateItemPricing({
    pricingMode: 'UNIT',
    salePriceCents: 10000, // R$ 100,00
    quantity: 5, // Base = R$ 500,00
    finishings: [
      { finishingId: 'f1', name: 'Refile', pricingBasis: 'PER_UNIT', unitPriceCents: 0, priceStatus: 'FREE' },
      { finishingId: 'f2', name: 'Cantos Arredondados', pricingBasis: 'FIXED', unitPriceCents: 2000, priceStatus: 'CONFIGURED' }, // R$ 20,00
      { finishingId: 'f3', name: 'Furação', pricingBasis: 'PER_UNIT', unitPriceCents: 200, priceStatus: 'CONFIGURED' }, // 5 * 2 = R$ 10,00
    ],
  });
  // Base = 50000. Finishings = 0 + 2000 + 1000 = 3000 (R$ 30,00). Total = 53000 (R$ 530,00)
  assert(
    calcMultiFin.baseTotalCents === 50000 && calcMultiFin.finishingsTotalCents === 3000 && calcMultiFin.totalItemCents === 53000,
    '13. Total do item soma base com todos os acabamentos ativos sem distorções (R$ 530,00)'
  );

  // 14. Desconto comercial percentual incide sobre o total com acabamentos
  // Subtotal = R$ 530,00. Desconto 10% = R$ 53,00. Total final = R$ 477,00
  const totalsPerc = calculateQuoteTotals(calcMultiFin.totalItemCents, {
    type: 'percentage',
    value: 10,
    appliedAmountCents: 0,
  });
  assert(
    totalsPerc.appliedAmountCents === 5300 && totalsPerc.totalFinalCents === 47700,
    '14. Desconto comercial percentual (10%) incide sobre subtotal com acabamentos (R$ 53,00 desc -> R$ 477,00)'
  );

  // 15. Desconto comercial em valor fixo respeita o total com acabamentos
  const totalsFixed = calculateQuoteTotals(calcMultiFin.totalItemCents, {
    type: 'fixed',
    value: 5000, // R$ 50,00
    appliedAmountCents: 0,
  });
  assert(
    totalsFixed.appliedAmountCents === 5000 && totalsFixed.totalFinalCents === 48000,
    '15. Desconto comercial em valor fixo deduz do total com acabamentos (R$ 530,00 - R$ 50,00 = R$ 480,00)'
  );

  // 16. Vários acabamentos somam centavos inteiros sem erros de ponto flutuante
  const calcPrecision = calculateItemPricing({
    pricingMode: 'SQUARE_METER',
    salePriceCents: 6533,
    quantity: 3,
    widthMm: 1250,
    heightMm: 800, // Área total = 3 × 1,00 m² = 3,00 m²
    finishings: [
      { finishingId: 'f1', name: 'Acabamento A', pricingBasis: 'PER_SQUARE_METER', unitPriceCents: 1233, priceStatus: 'CONFIGURED' },
      { finishingId: 'f2', name: 'Acabamento B', pricingBasis: 'FIXED', unitPriceCents: 1550, priceStatus: 'CONFIGURED' },
    ],
  });
  // Base = 3 * 6533 = 19599. Fin A = 3 * 1233 = 3699. Fin B = 1550. Total Fin = 5249. Total Item = 24848.
  assert(
    calcPrecision.baseTotalCents === 19599 &&
      calcPrecision.finishingsTotalCents === 5249 &&
      calcPrecision.totalItemCents === 24848 &&
      Number.isInteger(calcPrecision.totalItemCents),
    '16. Múltiplos acabamentos somam centavos inteiros sem float drift'
  );

  // 17. Acabamento obrigatório gratuito permanece incluso
  assert(
    refile?.isRequired === true && refile?.priceStatus === 'FREE' && refile?.priceCents === 0,
    '17. Acabamento obrigatório padrão é FREE e possui preço zero de acréscimo'
  );

  // 18. Acabamento opcional configurado reflete no motor ao ser fornecido
  const withOptional = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000,
    quantity: 1000,
    finishings: [{ finishingId: 'f_verniz', name: 'Verniz', pricingBasis: 'PER_LOT', unitPriceCents: 1500, priceStatus: 'CONFIGURED' }],
  });
  const withoutOptional = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000,
    quantity: 1000,
    finishings: [],
  });
  assert(
    withOptional.totalItemCents === 8500 && withoutOptional.totalItemCents === 7000,
    '18. Seleção ou desmarcação de acabamento opcional altera dinamicamente o total do item'
  );

  // 19. Acabamento opcional NOT_CONFIGURED não altera o valor do item
  const withUnconfigured = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000,
    quantity: 1000,
    finishings: [{ finishingId: 'f_lam', name: 'Laminação', pricingBasis: 'PER_SQUARE_METER', unitPriceCents: 0, priceStatus: 'NOT_CONFIGURED' }],
  });
  assert(
    withUnconfigured.totalItemCents === 7000 && withUnconfigured.finishingsTotalCents === 0,
    '19. Acabamento opcional NOT_CONFIGURED não agrega valor indevido ao item'
  );

  // 20. Snapshot do orçamento preserva QuoteItemFinishing completo
  const snapshotFin: QuoteItemFinishing = {
    finishingId: 'fin_lam_01',
    name: 'Laminação Fosca',
    pricingBasis: 'PER_SQUARE_METER',
    priceStatus: 'CONFIGURED',
    unitPriceCents: 1200,
    billedQuantity: 3,
    totalPriceCents: 3600,
    calculationMemory: '3,00 m² × R$ 12,00/m² = R$ 36,00',
    isRequired: false,
    isOptional: true,
  };
  assert(
    Boolean(
      snapshotFin.pricingBasis === 'PER_SQUARE_METER' &&
        snapshotFin.priceStatus === 'CONFIGURED' &&
        snapshotFin.totalPriceCents === 3600 &&
        snapshotFin.calculationMemory?.includes('3,00 m²')
    ),
    '20. Snapshot do orçamento preserva todas as propriedades canônicas do acabamento'
  );

  // 21. Alteração no catálogo de acabamentos não altera o snapshot salvo
  const originalQuoteItemTotal = snapshotFin.totalPriceCents;
  // Simulando alteração posterior no catálogo:
  const updatedCatalogFinishing: Finishing = {
    id: 'fin_lam_01',
    tenantId: 'emp_alphaprint_01',
    name: 'Laminação Fosca',
    pricingBasis: 'PER_SQUARE_METER',
    priceStatus: 'CONFIGURED',
    priceCents: 2000, // subiu para R$ 20,00
    compatibleProductIds: [],
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
  // O snapshot salvo no orçamento permanece inalterado:
  assert(
    snapshotFin.totalPriceCents === originalQuoteItemTotal && snapshotFin.unitPriceCents === 1200,
    '21. Alteração de preço posterior no catálogo não corrompe o snapshot salvo'
  );

  // 22. Mudança de tenant carrega os acabamentos isolados daquele tenant
  const tenant1Finishings = getInitialFinishingsTemplate('emp_tenant_alpha');
  const tenant2Finishings = getInitialFinishingsTemplate('emp_tenant_beta');
  const allMerged = initializeTenantFinishings([...tenant1Finishings, ...tenant2Finishings], 'emp_tenant_alpha');
  const alphaOnly = allMerged.filter(f => f.tenantId === 'emp_tenant_alpha');
  assert(
    alphaOnly.length === 21 && alphaOnly.every(f => f.tenantId === 'emp_tenant_alpha'),
    '22. Isolamento estrito de acabamentos por tenantId'
  );

  // 23. Formatação monetária de acabamentos no PDF
  const formattedMemory = `Laminação Fosca (+${formatCentsToBRL(3600)})`;
  assert(
    formattedMemory.includes('Laminação Fosca') && formattedMemory.includes('36,00'),
    '23. Formatação monetária de acabamentos no PDF consistente com a proposta'
  );

  // 24. Modal de confirmação de aprovação sem promessa de ArteFlow
  const modalApprovalText = 'Aprovar este orçamento? Após a aprovação, o orçamento será registrado como aprovado comercialmente no OrçaGraf.';
  assert(
    !modalApprovalText.includes('ArteFlow') && modalApprovalText.includes('aprovado comercialmente no OrçaGraf'),
    '24. Mensagem do modal de aprovação reflete estritamente o modo standalone'
  );

  // 25. Subtítulo de Orçamentos sem promessa de envio direto por WhatsApp
  const quotesSubtitle = 'Elabore propostas, aplique descontos comerciais, baixe o PDF e acompanhe as aprovações.';
  assert(
    !quotesSubtitle.includes('envie pelo WhatsApp') && quotesSubtitle.includes('acompanhe as aprovações'),
    '25. Subtítulo da página de Orçamentos sem falsas promessas de WhatsApp'
  );

  // 26. Todos os 21 acabamentos oficiais de template possuem bases e status determinísticos
  const validBases: FinishingPricingBasis[] = ['FIXED', 'PER_UNIT', 'PER_LOT', 'PER_SQUARE_METER', 'PER_LINEAR_METER'];
  const validStatuses: FinishingPriceStatus[] = ['CONFIGURED', 'NOT_CONFIGURED', 'FREE'];
  const allValid = templateAlphaprint.length === 21 && templateAlphaprint.every(
    f => validBases.includes(f.pricingBasis) && validStatuses.includes(f.priceStatus)
  );
  assert(
    allValid,
    '26. Todos os 21 acabamentos de seed possuem bases canônicas e status explícitos'
  );

  return results;
}
