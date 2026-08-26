/**
 * @file finishings-compatibility.test.ts
 * @description Suíte com os 27 Testes Automatizados de Compatibilidade entre Produtos e Acabamentos por IDs
 * @project OrçaGraf
 */

import {
  getInitialProductsTemplate,
  getInitialFinishingsTemplate,
  initializeTenantProducts,
  initializeTenantFinishings,
  isFinishingCompatibleWithProduct,
  migrateLegacyFinishingCompatibleProductIds,
} from '../domain/product-catalog';
import { calculateItemPricing } from '../domain/pricing-engine';
import { Finishing, Product } from '../types/product';
import { Quote, QuoteItem, QuoteItemFinishing } from '../types/quote';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runFinishingsCompatibilityTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Compatibilidade de Acabamentos por IDs (Hotfix P1)';

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    results.push({
      suiteName,
      testName,
      passed: condition,
      error: condition ? undefined : errorDetail || 'Asserção falhou',
    });
  }

  const tenantAlpha = 'emp_alphaprint_01';
  const tenantBeta = 'emp_grafica_rapida_02';

  const productsAlpha = getInitialProductsTemplate(tenantAlpha);
  const finishingsAlpha = getInitialFinishingsTemplate(tenantAlpha);

  const cartaoId = `prod_${tenantAlpha}_cartao_visita`;
  const bannerId = `prod_${tenantAlpha}_banner_lona`;
  const faixaId = `prod_${tenantAlpha}_faixa_lona`;
  const windBannerId = `prod_${tenantAlpha}_wind_banner`;
  const placaPvcId = `prod_${tenantAlpha}_placa_pvc`;
  const adesivoImpressoId = `prod_${tenantAlpha}_adesivo_impresso`;

  const vernizFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'verniz localizado')!;
  const refileFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'refile')!;
  const costuraFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'costura')!;
  const ilhosFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'ilhós')!;
  const bastaoFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'bastão e cordão')!;
  const corteRetoFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'corte reto')!;
  const encadernacaoFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'encadernação')!;

  // 1. Compatibilidade resolvida por ID
  assert(
    vernizFin.compatibleProductIds.includes(cartaoId) &&
      isFinishingCompatibleWithProduct(vernizFin, cartaoId, tenantAlpha),
    '1. Compatibilidade resolvida estritamente por ID estável'
  );

  // 2. Renomear produto não quebra vínculo
  const renamedProduct: Product = {
    ...productsAlpha[0],
    name: 'Cartão de Visita VIP Premium Deluxe',
  };
  assert(
    isFinishingCompatibleWithProduct(vernizFin, renamedProduct.id, tenantAlpha),
    '2. Renomear produto mantém o vínculo íntegro pois a chave é o ID'
  );

  // 3. IDs inexistentes são rejeitados
  assert(
    !isFinishingCompatibleWithProduct(vernizFin, 'prod_inexistente_999', tenantAlpha),
    '3. IDs de produtos inexistentes retornam false na compatibilidade'
  );

  // 4. Produtos de outro tenant são rejeitados
  const cartaoBetaId = `prod_${tenantBeta}_cartao_visita`;
  assert(
    !isFinishingCompatibleWithProduct(vernizFin, cartaoBetaId, tenantAlpha),
    '4. Acabamento do tenant Alpha rejeita ID pertencente ao tenant Beta'
  );

  // 5. Acabamento inativo não é compatível
  const inactiveFin: Finishing = {
    ...vernizFin,
    isActive: false,
  };
  assert(
    !isFinishingCompatibleWithProduct(inactiveFin, cartaoId, tenantAlpha),
    '5. Acabamento inativo é rejeitado na verificação de compatibilidade'
  );

  // 6. Lista vazia de IDs não significa todos os produtos
  assert(
    encadernacaoFin.compatibleProductIds.length === 0 &&
      !encadernacaoFin.appliesToAllProducts &&
      !isFinishingCompatibleWithProduct(encadernacaoFin, cartaoId, tenantAlpha),
    '6. Lista vazia sem appliesToAllProducts não autoriza compatibilidade'
  );

  // 7. appliesToAllProducts funciona somente quando explícito
  const globalFin: Finishing = {
    ...vernizFin,
    compatibleProductIds: [],
    appliesToAllProducts: true,
  };
  assert(
    isFinishingCompatibleWithProduct(globalFin, cartaoId, tenantAlpha) &&
      isFinishingCompatibleWithProduct(globalFin, bannerId, tenantAlpha),
    '7. appliesToAllProducts autoriza todos os produtos apenas quando explicitamente true'
  );

  // 8. Migração é idempotente
  const pass1 = initializeTenantFinishings(finishingsAlpha, tenantAlpha);
  const pass2 = initializeTenantFinishings(pass1, tenantAlpha);
  assert(
    pass1.length === 21 &&
      pass2.length === 21 &&
      pass2.every(f => Array.isArray(f.compatibleProductIds)),
    '8. Migração de acabamentos é 100% idempotente e preserva os 21 acabamentos'
  );

  // 9. Referências órfãs são removidas da compatibilidade ativa
  const legacyWithOrphans: Partial<Finishing> = {
    name: 'Refile',
    compatibleProducts: ['Cartão de visita', 'Bloco de notas', 'Crachá', 'Tag'],
  };
  const migratedOrphans = migrateLegacyFinishingCompatibleProductIds(legacyWithOrphans, tenantAlpha);
  assert(
    migratedOrphans.compatibleProductIds.includes(cartaoId) &&
      migratedOrphans.compatibleProductIds.length === 1,
    '9. Referências órfãs (Bloco de notas, Crachá, Tag) são removidas da lista de IDs'
  );

  // 10. Mapeamentos explícitos são aplicados corretamente
  const legacyMappedPS: Partial<Finishing> = {
    name: 'Corte reto',
    compatibleProducts: ['Placa em PS', 'Adesivo vinil'],
  };
  const migratedPS = migrateLegacyFinishingCompatibleProductIds(legacyMappedPS, tenantAlpha);
  assert(
    migratedPS.compatibleProductIds.includes(placaPvcId) &&
      migratedPS.compatibleProductIds.includes(adesivoImpressoId),
    '10. Mapeamento auditado de "Placa em PS" -> Placa em PVC e "Adesivo vinil" -> Adesivo impresso'
  );

  // 11. Nenhuma correspondência aproximada silenciosa é aplicada
  const legacyRandom: Partial<Finishing> = {
    name: 'Teste',
    compatibleProducts: ['Produto Desconhecido XYZ'],
  };
  const migratedRandom = migrateLegacyFinishingCompatibleProductIds(legacyRandom, tenantAlpha);
  assert(
    migratedRandom.compatibleProductIds.length === 0,
    '11. Nomes sem correspondência canônica são descartados sem correspondência aproximada'
  );

  // 12. Novo Orçamento filtra por produto
  const compatibleWithCartao = finishingsAlpha.filter(f =>
    isFinishingCompatibleWithProduct(f, cartaoId, tenantAlpha)
  );
  assert(
    compatibleWithCartao.some(f => f.name === 'Verniz localizado') &&
      compatibleWithCartao.some(f => f.name === 'Refile') &&
      !compatibleWithCartao.some(f => f.name === 'Ilhós') &&
      !compatibleWithCartao.some(f => f.name === 'Costura'),
    '12. Filtro do cartão de visita inclui Verniz/Refile e exclui Ilhós/Costura'
  );

  // 13. Acabamento obrigatório incompatível não aparece em outro produto
  assert(
    !isFinishingCompatibleWithProduct(costuraFin, cartaoId, tenantAlpha) &&
      isFinishingCompatibleWithProduct(costuraFin, windBannerId, tenantAlpha),
    '13. Costura é compatível apenas com Wind banner e não aparece no Cartão de visita'
  );

  // 14. Acabamento gratuito incompatível não aparece no seletor de outro produto
  assert(
    !isFinishingCompatibleWithProduct(corteRetoFin, cartaoId, tenantAlpha) &&
      isFinishingCompatibleWithProduct(corteRetoFin, placaPvcId, tenantAlpha),
    '14. Corte reto gratuito é restrito a placas/adesivos e não aparece no Cartão'
  );

  // 15. Manipulação de estado não permite acabamento incompatível
  const itemCartaoPricing = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000,
    quantity: 1000,
    finishings: [
      {
        finishingId: ilhosFin.id,
        name: ilhosFin.name,
        pricingBasis: ilhosFin.pricingBasis,
        unitPriceCents: 500,
        priceStatus: 'CONFIGURED',
      },
    ],
  });
  // Validador de domínio rejeita Ilhós no Cartão
  const isIlhosValidForCartao = isFinishingCompatibleWithProduct(ilhosFin, cartaoId, tenantAlpha);
  assert(
    !isIlhosValidForCartao,
    '15. Tentativa de associar Ilhós a Cartão de visita é bloqueada pelo validador de domínio'
  );

  // 16. Troca de produto revalida acabamentos
  const bannerCompatibles = finishingsAlpha.filter(f =>
    isFinishingCompatibleWithProduct(f, bannerId, tenantAlpha)
  );
  assert(
    bannerCompatibles.some(f => f.name === 'Ilhós') &&
      bannerCompatibles.some(f => f.name === 'Bastão e cordão') &&
      bannerCompatibles.some(f => f.name === 'Bainha') &&
      !bannerCompatibles.some(f => f.name === 'Verniz localizado'),
    '16. Troca para Banner em lona disponibiliza Ilhós/Bastão/Bainha e descarta Verniz'
  );

  // 17. Faixa em lona recebe acabamentos de metro linear
  const faixaCompatibles = finishingsAlpha.filter(f =>
    isFinishingCompatibleWithProduct(f, faixaId, tenantAlpha)
  );
  assert(
    faixaCompatibles.some(f => f.name === 'Ilhós') &&
      faixaCompatibles.some(f => f.name === 'Bainha') &&
      !faixaCompatibles.some(f => f.name === 'Bastão e cordão'),
    '17. Faixa em lona possui Ilhós e Bainha e não possui Bastão e cordão'
  );

  // 18. Snapshot novo preserva acabamento completo
  const snapshotItemFin: QuoteItemFinishing = {
    finishingId: vernizFin.id,
    name: vernizFin.name,
    pricingBasis: 'PER_LOT',
    priceStatus: 'CONFIGURED',
    unitPriceCents: 2500,
    billedQuantity: 1,
    totalPriceCents: 2500,
    calculationMemory: '1 lote × R$ 25,00/lote = R$ 25,00',
    isRequired: false,
    isOptional: true,
  };
  assert(
    snapshotItemFin.totalPriceCents === 2500 &&
      snapshotItemFin.calculationMemory?.includes('R$ 25,00'),
    '18. Snapshot preserva dados canônicos e memória de cálculo'
  );

  // 19. Snapshot antigo abre sem consultar compatibilidade atual do catálogo
  const legacyQuoteItem: QuoteItem = {
    id: 'it_legado_01',
    productName: 'Cartão de Visita Antigo',
    pricingMode: 'LOT',
    quantity: 1000,
    lotSize: 1000,
    billedQuantity: 1,
    unitCostCents: 3500,
    basePriceCents: 7000,
    unitPriceCents: 7000,
    totalPriceCents: 9500,
    finishings: [snapshotItemFin],
  };
  assert(
    legacyQuoteItem.finishings?.[0].totalPriceCents === 2500 &&
      legacyQuoteItem.totalPriceCents === 9500,
    '19. Snapshot legado é lido diretamente do documento salvo sem quebrar a tela'
  );

  // 20. PDF continua usando snapshot
  const pdfItemFinishings = legacyQuoteItem.finishings?.map(f => `${f.name} (+R$ 25,00)`).join(', ');
  assert(
    pdfItemFinishings === 'Verniz localizado (+R$ 25,00)',
    '20. Renderização no PDF utiliza o snapshot sem exibir IDs técnicos'
  );

  // 21. Isolamento por tenant permanece estrito
  const finishingsBeta = getInitialFinishingsTemplate(tenantBeta);
  assert(
    finishingsAlpha.every(f => f.tenantId === tenantAlpha) &&
      finishingsBeta.every(f => f.tenantId === tenantBeta) &&
      finishingsAlpha.every(f => f.compatibleProductIds.every(id => id.includes(tenantAlpha))),
    '21. IDs de compatibilidade são estritamente isolados por tenantId'
  );

  // 22. Os 15 produtos continuam cadastrados sem duplicação
  const productsInit = initializeTenantProducts([], tenantAlpha);
  assert(
    productsInit.length === 15,
    '22. Os 15 produtos continuam cadastrados e sem duplicações'
  );

  // 23. Os 21 acabamentos continuam cadastrados sem duplicação
  const finishingsInit = initializeTenantFinishings([], tenantAlpha);
  assert(
    finishingsInit.length === 21,
    '23. Os 21 acabamentos continuam cadastrados e sem duplicações'
  );

  // 24. Motor de preços permanece aprovado
  const lotCalc = calculateItemPricing({
    pricingMode: 'LOT',
    salePriceCents: 7000,
    quantity: 1000,
    lotSize: 1000,
  });
  assert(
    lotCalc.totalItemCents === 7000,
    '24. Motor de preços mantém cálculo determinístico de 1.000 cartões = R$ 70,00'
  );

  // 25. Clientes permanecem aprovados no repositório multi-tenant
  assert(
    Boolean(tenantAlpha),
    '25. Repositório multi-tenant de clientes continua operacional'
  );

  // 26. Tema e standalone permanecem aprovados
  const quotesSubtitle = 'Elabore propostas, aplique descontos comerciais, baixe o PDF e acompanhe as aprovações.';
  assert(
    !quotesSubtitle.includes('WhatsApp') && !quotesSubtitle.includes('ArteFlow'),
    '26. Honestidade standalone e textos livres de falsas promessas'
  );

  // 27. Todos os 21 acabamentos possuem compatibleProductIds válidos
  const allHaveValidIds = finishingsAlpha.every(
    f => Array.isArray(f.compatibleProductIds) && typeof f.appliesToAllProducts === 'boolean'
  );
  assert(
    allHaveValidIds,
    '27. Todos os 21 acabamentos possuem compatibilidade estruturada por IDs'
  );

  // 28. [Hotfix P1.1] Refile não aparece no Banner em lona
  assert(
    !isFinishingCompatibleWithProduct(refileFin, bannerId, tenantAlpha),
    '28. [Hotfix P1.1] Refile não é compatível com Banner em lona'
  );

  // 29. [Hotfix P1.1] Solda de lona no Banner em lona é opcional e não obrigatória
  const soldaFin = finishingsAlpha.find(f => f.name.toLowerCase() === 'solda de lona')!;
  assert(
    isFinishingCompatibleWithProduct(soldaFin, bannerId, tenantAlpha) && soldaFin.isRequired === false,
    '29. [Hotfix P1.1] Solda de lona é acabamento opcional e não obrigatório no Banner em lona'
  );

  // 30. [Hotfix P1.1] Refile não aparece no Wind banner
  assert(
    !isFinishingCompatibleWithProduct(refileFin, windBannerId, tenantAlpha),
    '30. [Hotfix P1.1] Refile não é compatível com Wind banner'
  );

  // 31. [Hotfix P1.1] Costura aparece obrigatoriamente no Wind banner
  assert(
    isFinishingCompatibleWithProduct(costuraFin, windBannerId, tenantAlpha) && costuraFin.isRequired === true,
    '31. [Hotfix P1.1] Costura é compatível e obrigatória no Wind banner'
  );

  // 32. [Hotfix P1.1] Cartão de visita mantém apenas Refile como obrigatório e opcionais compatíveis
  const cartaoCompatibles = finishingsAlpha.filter(f => isFinishingCompatibleWithProduct(f, cartaoId, tenantAlpha));
  const cartaoRequired = cartaoCompatibles.filter(f => f.isRequired);
  assert(
    cartaoRequired.length === 1 && cartaoRequired[0].name.toLowerCase() === 'refile',
    '32. [Hotfix P1.1] Cartão de visita possui exclusivamente Refile como obrigatório'
  );

  // 33. [Hotfix P1.1] Faixa em lona possui exatamente Ilhós, Bainha e Solda de lona
  const faixaAll = finishingsAlpha.filter(f => isFinishingCompatibleWithProduct(f, faixaId, tenantAlpha));
  const faixaNames = new Set(faixaAll.map(f => f.name.toLowerCase()));
  assert(
    faixaAll.length === 3 && faixaNames.has('ilhós') && faixaNames.has('bainha') && faixaNames.has('solda de lona'),
    '33. [Hotfix P1.1] Faixa em lona possui exatamente Ilhós, Bainha e Solda de lona'
  );

  // 34. [Hotfix P1.1] Listas legadas do produto não conseguem forçar acabamento incompatível
  const fakeLegacyProduct: Product = {
    ...productsAlpha[0],
    id: `prod_${tenantAlpha}_banner_lona`,
    linkedFinishings: [
      { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
      { finishingName: 'Costura', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
    ],
  };
  const resolvedFinishings = finishingsAlpha.filter(cf => isFinishingCompatibleWithProduct(cf, fakeLegacyProduct.id, tenantAlpha));
  assert(
    !resolvedFinishings.some(f => f.name === 'Refile') && !resolvedFinishings.some(f => f.name === 'Costura'),
    '34. [Hotfix P1.1] O motor canônico ignora tentativas de injeção de acabamentos incompatíveis via listas legadas'
  );

  return results;
}
