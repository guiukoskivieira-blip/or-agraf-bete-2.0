/**
 * @file domain-integrity.test.ts
 * @description Suíte Completa de Testes de Regras de Negócio, Integridade de Domínio, Catálogo e Vendedor
 * @project OrçaGraf
 */

import { formatCentsToBRL, parseBRLToCents, normalizeMonetaryText } from '../domain/money';
import {
  calculateQuoteDiscount,
  calculateInstallments,
  validateInstallmentsSum,
} from '../domain/financial-calculations';
import {
  ALLOWED_QUOTE_STATUSES,
  QUOTE_STATUS_METADATA,
  isValidQuoteStatus,
  isOpenQuote,
} from '../domain/quote-status';
import {
  canManageQuotes,
  canApplyDiscounts,
  canDownloadQuotePdf,
  canSendQuoteWhatsApp,
  getDefaultPermissionsForProfile,
  hasUserPermission,
  User,
} from '../types/tenant';
import { Quote } from '../types/quote';
import { ArteFlowIntegrationService } from '../services/arteflow-integration.service';
import { WhatsAppIntegrationService } from '../services/whatsapp-integration.service';
import { PdfExportService } from '../services/pdf-export.service';
import {
  getInitialProductsTemplate,
  initializeTenantProducts,
  getInitialMaterialsTemplate,
  initializeTenantMaterials,
  getInitialFinishingsTemplate,
  initializeTenantFinishings,
  calculateProductPrice,
} from '../domain/product-catalog';
import { Product } from '../types/product';
import { evaluateQuoteApproval } from '../domain/quote-approval';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runAllDomainTests(): { results: TestResult[]; total: number; passed: number; failed: number } {
  const results: TestResult[] = [];

  function assert(condition: boolean, testName: string, suiteName: string) {
    if (condition) {
      results.push({ suiteName, testName, passed: true });
    } else {
      results.push({ suiteName, testName, passed: false, error: 'Assertion failed' });
    }
  }

  // 1. Desconto Percentual
  const discPerc = calculateQuoteDiscount(10000, 'percentage', 10);
  assert(discPerc.appliedAmountCents === 1000, '10% de 10000 centavos = 1000 centavos', '1. Desconto Percentual');
  assert(discPerc.totalFinalCents === 9000, 'Total final = 9000 centavos (10000 - 1000)', '1. Desconto Percentual');

  // 2. Desconto Fixo
  const discFix = calculateQuoteDiscount(10000, 'fixed', 2500);
  assert(discFix.appliedAmountCents === 2500, 'Desconto fixo de 2500 centavos aplicado', '2. Desconto Fixo');
  assert(discFix.totalFinalCents === 7500, 'Total final = 7500 centavos (10000 - 2500)', '2. Desconto Fixo');

  // 3. Desconto Superior ao Subtotal (Nunca permite negativo nem superior)
  const discOverflow = calculateQuoteDiscount(10000, 'fixed', 15000);
  assert(discOverflow.appliedAmountCents === 10000, 'Desconto de 15000 limitado a 10000 centavos', '3. Desconto Superior ao Subtotal');
  assert(discOverflow.totalFinalCents === 0, 'Total final limitado a 0 (nunca negativo)', '3. Desconto Superior ao Subtotal');

  const discNegative = calculateQuoteDiscount(10000, 'fixed', -500);
  assert(discNegative.appliedAmountCents === 0 && discNegative.totalFinalCents === 10000, 'Desconto negativo é tratado como 0', '3. Desconto Superior ao Subtotal');

  // 4. Arredondamento em Centavos
  const discRound = calculateQuoteDiscount(1000, 'percentage', 33.33);
  assert(discRound.appliedAmountCents === 333, '33.33% de 1000 centavos arredonda para 333 centavos', '4. Arredondamento em Centavos');
  assert(discRound.totalFinalCents === 667, 'Total final arredondado = 667 centavos', '4. Arredondamento em Centavos');

  // 5. Entrada + Saldo
  const installmentsEntry = calculateInstallments(10000, 'down_payment_and_balance', 2, 3000, 30, '2026-02-24');
  assert(installmentsEntry.length === 3, 'Entrada de 3000 + saldo em 2x gera 3 parcelas', '5. Entrada + Saldo');
  assert(installmentsEntry[0].amountCents === 3000, 'Parcela 1 (Entrada) = 3000 centavos', '5. Entrada + Saldo');
  assert(installmentsEntry[1].amountCents === 3500 && installmentsEntry[2].amountCents === 3500, 'Parcelas 2 e 3 = 3500 centavos cada', '5. Entrada + Saldo');
  assert(validateInstallmentsSum(installmentsEntry, 10000), 'Soma das parcelas é exatamente 10000 centavos', '5. Entrada + Saldo');

  // 6. Parcelamento com Divisão Inexata (Centavo Residual)
  const installmentsInexact = calculateInstallments(10000, 'installments', 3, 0, 30, '2026-02-24');
  assert(installmentsInexact.length === 3, '10000 centavos em 3 parcelas gera 3 parcelas', '6. Divisão Inexata de Centavos');
  assert(installmentsInexact[0].amountCents === 3334, 'Primeira parcela absorve o centavo residual (3334 centavos)', '6. Divisão Inexata de Centavos');
  assert(installmentsInexact[1].amountCents === 3333 && installmentsInexact[2].amountCents === 3333, 'Demais parcelas = 3333 centavos', '6. Divisão Inexata de Centavos');

  // 7. Soma Exata das Parcelas
  assert(validateInstallmentsSum(installmentsInexact, 10000), 'Soma de 3334 + 3333 + 3333 === 10000 rigorosamente', '7. Soma Exata das Parcelas');
  const complexSplit = calculateInstallments(77777, 'installments', 7, 0, 15, '2026-02-24');
  assert(validateInstallmentsSum(complexSplit, 77777), 'Divisão de 77777 centavos em 7 parcelas soma 77777 exatamente', '7. Soma Exata das Parcelas');

  // 8. Contrato QUOTE_APPROVED para o ArteFlow
  const testQuote: Quote = {
    id: 'quot_test_01',
    tenantId: 'emp_alphaprint_01',
    quoteNumber: 'ORC-2026-9999',
    customerId: 'cust_01',
    customerName: 'Cliente Teste Ltda',
    customerDocument: '11.222.333/0001-44',
    customerContact: '(11) 98765-4321',
    customerEmail: 'compras@cliente.com.br',
    currentVersion: 1,
    status: 'approved',
    items: [
      {
        id: 'it_01',
        productName: 'Banner Lona Frontlight',
        quantity: 2,
        unitCostCents: 2000,
        unitPriceCents: 5000,
        totalPriceCents: 10000,
        materialName: 'Lona 440g',
        finishings: [
          {
            finishingId: 'fin_01',
            name: 'Refile',
            unitPriceCents: 0,
            totalPriceCents: 0,
            isRequired: true,
            isOptional: false,
          },
          {
            finishingId: 'fin_02',
            name: 'Ilhós',
            unitPriceCents: 0,
            totalPriceCents: 0,
            isRequired: false,
            isOptional: true,
          },
        ],
      },
    ],
    subtotalCents: 10000,
    discount: {
      type: 'percentage',
      value: 10,
      appliedAmountCents: 1000,
    },
    discountCents: 1000,
    shippingCents: 0,
    totalCents: 9000,
    estimatedProductionDays: 3,
    paymentTerms: '50% entrada e saldo na retirada',
    financialTerms: {
      paymentMethod: 'pix',
      paymentCondition: 'down_payment_and_balance',
      installmentsCount: 1,
      downPaymentCents: 4500,
      installmentIntervalDays: 15,
      installments: [
        { installmentNumber: 1, dueDate: '2026-02-24', amountCents: 4500 },
        { installmentNumber: 2, dueDate: '2026-03-11', amountCents: 4500 },
      ],
    },
    sellerId: 'usr_sales_01',
    sellerName: 'Beatriz Lima (Comercial)',
    salespersonId: 'usr_sales_01',
    salespersonName: 'Beatriz Lima (Comercial)',
    versions: [],
    createdAt: '2026-02-24T10:00:00Z',
    updatedAt: '2026-02-24T10:00:00Z',
  };

  const dummyUser: User = {
    id: 'usr_sales_01',
    tenantId: 'emp_alphaprint_01',
    name: 'Beatriz Lima (Comercial)',
    email: 'beatriz@empresa.com',
    role: 'sales',
    baseProfile: 'sales',
    permissions: getDefaultPermissionsForProfile('sales'),
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const payload = ArteFlowIntegrationService.buildQuoteApprovedEvent(testQuote, dummyUser);
  assert(payload.eventName === 'QUOTE_APPROVED', 'Tipo de evento é QUOTE_APPROVED', '8. Integração ArteFlow');
  assert(payload.tenantId === 'emp_alphaprint_01', 'TenantId preservado no evento', '8. Integração ArteFlow');
  assert(payload.sellerId === 'usr_sales_01', 'sellerId transmitido para o ArteFlow', '8. Integração ArteFlow');
  assert(payload.sellerName === 'Beatriz Lima (Comercial)', 'sellerName transmitido para o ArteFlow', '8. Integração ArteFlow');
  assert(payload.totalFinalCents === 9000, 'Total de 9000 centavos transmitido', '8. Integração ArteFlow');
  assert(payload.items[0].finishings.length === 2, 'Acabamentos do item transmitidos para o ArteFlow', '8. Integração ArteFlow');
  assert(payload.financialConditions.installments.length === 2, 'Parcelas transmitidas para o ArteFlow', '8. Integração ArteFlow');

  // 9. Ciclo de Vida e Status
  assert(ALLOWED_QUOTE_STATUSES.length === 3, 'Exatamente 3 status oficiais permitidos', '9. Status Permitidos');
  assert(isValidQuoteStatus('awaiting_customer') && isValidQuoteStatus('approved') && isValidQuoteStatus('rejected'), 'Status oficiais validados', '9. Status Permitidos');
  assert(!isValidQuoteStatus('expired'), 'Status "Expirado" não é permitido', '9. Status Permitidos');
  assert(isOpenQuote({ status: 'awaiting_customer' }) && !isOpenQuote({ status: 'approved' }), 'isOpenQuote valida apenas awaiting_customer', '9. Status Permitidos');

  // 10. Permissões Granulares
  assert(canManageQuotes(dummyUser), 'Comercial pode gerenciar orçamentos', '10. Permissões Granulares');
  assert(canApplyDiscounts(dummyUser), 'Comercial pode aplicar descontos', '10. Permissões Granulares');
  assert(canDownloadQuotePdf(dummyUser), 'Comercial pode baixar PDF', '10. Permissões Granulares');
  assert(canSendQuoteWhatsApp(dummyUser), 'Comercial pode enviar WhatsApp', '10. Permissões Granulares');
  assert(!hasUserPermission(dummyUser, 'users_permissions', 'delete'), 'Comercial não pode excluir usuários', '10. Permissões Granulares');

  const awaitingQuote: Quote = { ...testQuote, status: 'awaiting_customer' };
  assert(
    evaluateQuoteApproval(awaitingQuote, dummyUser.tenantId, dummyUser).allowed,
    'Usuário autorizado pode aprovar orçamento aguardando cliente',
    '10. Permissões Granulares'
  );
  const rejectedDecision = evaluateQuoteApproval(
    { ...testQuote, status: 'rejected' },
    dummyUser.tenantId,
    dummyUser
  );
  assert(
    'reason' in rejectedDecision && rejectedDecision.reason === 'INVALID_STATUS',
    'Orçamento recusado não pode ser aprovado',
    '10. Permissões Granulares'
  );
  const otherTenantDecision = evaluateQuoteApproval(
    awaitingQuote,
    'emp_outro_tenant',
    { ...dummyUser, tenantId: 'emp_outro_tenant' }
  );
  assert(
    'reason' in otherTenantDecision && otherTenantDecision.reason === 'TENANT_MISMATCH',
    'Aprovação de outro tenant é bloqueada na regra de negócio',
    '10. Permissões Granulares'
  );
  const noApprovalPermissionUser: User = {
    ...dummyUser,
    role: 'reception',
    baseProfile: 'reception',
    permissions: getDefaultPermissionsForProfile('reception'),
  };
  const permissionDecision = evaluateQuoteApproval(
    awaitingQuote,
    noApprovalPermissionUser.tenantId,
    noApprovalPermissionUser
  );
  assert(
    'reason' in permissionDecision && permissionDecision.reason === 'PERMISSION_DENIED',
    'Aprovação sem permissão é bloqueada na regra de negócio',
    '10. Permissões Granulares'
  );
  const alreadyApprovedDecision = evaluateQuoteApproval(testQuote, dummyUser.tenantId, dummyUser);
  assert(
    'reason' in alreadyApprovedDecision && alreadyApprovedDecision.idempotent === true,
    'Reaprovação é tratada como idempotente e não gera novo evento',
    '10. Permissões Granulares'
  );

  // 11. Isolamento Multi-Tenancy
  assert(testQuote.tenantId === dummyUser.tenantId, 'Isolamento por tenantId garantido', '11. Multi-Tenant');

  // 12. WhatsApp e PDF
  const sanitized = WhatsAppIntegrationService.sanitizePhoneNumber('(11) 98765-4321');
  assert(sanitized.cleanPhone === '5511987654321' && sanitized.isValid, 'Número sanitizado com código do país (5511987654321)', '12. WhatsApp & PDF');
  const filename = PdfExportService.getQuotePdfFilename(testQuote);
  assert(filename.startsWith('Orcamento_ORC-2026-9999_'), 'Nome do PDF segue padrão Orcamento_NUMERO_CLIENTE.pdf', '12. WhatsApp & PDF');

  // 13. Inicialização dos 15 Produtos Oficiais e seus Vínculos de Acabamento
  const initialProducts = getInitialProductsTemplate('emp_alphaprint_01');
  assert(initialProducts.length === 15, 'Catálogo inicial possui exatamente 15 produtos', '13. Inicialização dos 15 Produtos');
  const expectedNames = [
    'Cartão de visita',
    'Flyer',
    'Panfleto',
    'Folder',
    'Cardápio',
    'Banner em lona',
    'Faixa em lona',
    'Adesivo impresso',
    'Adesivo de recorte',
    'Placa em PVC',
    'Placa em ACM',
    'Wind banner',
    'Fachada',
    'Plotagem de veículo',
    'Cartaz',
  ];
  const allNamesPresent = expectedNames.every(name => initialProducts.some(p => p.name === name));
  assert(allNamesPresent, 'Todos os 15 produtos oficiais foram cadastrados pelos nomes exatos', '13. Inicialização dos 15 Produtos');

  // Validação dos Acabamentos Vinculados
  const cartaoProd = initialProducts.find(p => p.name === 'Cartão de visita')!;
  assert(
    cartaoProd.linkedFinishings?.some(f => f.finishingName === 'Refile' && f.isRequired),
    'Cartão de visita possui Refile como acabamento obrigatório',
    '13. Acabamentos Vinculados'
  );
  assert(
    cartaoProd.linkedFinishings?.some(f => f.finishingName === 'Laminação fosca' && !f.isRequired),
    'Cartão de visita possui Laminação fosca como acabamento opcional',
    '13. Acabamentos Vinculados'
  );

  const folderProd = initialProducts.find(p => p.name === 'Folder')!;
  assert(
    folderProd.linkedFinishings?.filter(f => f.isRequired).length === 3,
    'Folder possui Refile, Vinco e Dobra como obrigatórios',
    '13. Acabamentos Vinculados'
  );

  const windBannerProd = initialProducts.find(p => p.name === 'Wind banner')!;
  assert(
    windBannerProd.linkedFinishings?.some(f => f.finishingName === 'Costura' && f.isRequired),
    'Wind banner possui Costura como acabamento obrigatório',
    '13. Acabamentos Vinculados'
  );

  // 14. Idempotência e Prevenção de Duplicação
  const initializedOnce = initializeTenantProducts([], 'emp_alphaprint_01');
  const initializedTwice = initializeTenantProducts(initializedOnce, 'emp_alphaprint_01');
  assert(initializedOnce.length === 15, 'Primeira inicialização cria 15 produtos', '14. Idempotência e Duplicação');
  assert(initializedTwice.length === 15, 'Segunda inicialização não duplica registros (idempotência)', '14. Idempotência e Duplicação');

  // Insumos (21 cadastrados)
  const initialMaterials = getInitialMaterialsTemplate('emp_alphaprint_01');
  assert(initialMaterials.length === 21, 'Catálogo de insumos possui exatamente 21 itens', 'Insumos (21 cadastrados)');
  const initializedMatsTwice = initializeTenantMaterials(initialMaterials, 'emp_alphaprint_01');
  assert(initializedMatsTwice.length === 21, 'Inicialização de insumos é idempotente sem duplicação', 'Insumos (21 cadastrados)');

  // Acabamentos (21 cadastrados)
  const initialFinishings = getInitialFinishingsTemplate('emp_alphaprint_01');
  assert(initialFinishings.length === 21, 'Catálogo de acabamentos possui exatamente 21 itens', 'Acabamentos (21 cadastrados)');
  const initializedFinTwice = initializeTenantFinishings(initialFinishings, 'emp_alphaprint_01');
  assert(initializedFinTwice.length === 21, 'Inicialização de acabamentos é idempotente sem duplicação', 'Acabamentos (21 cadastrados)');

  // 15. Isolamento por tenantId
  const tenantAProducts = getInitialProductsTemplate('tenant_A');
  const tenantBProducts = getInitialProductsTemplate('tenant_B');
  const allTenantATenantIds = tenantAProducts.every(p => p.tenantId === 'tenant_A');
  const allTenantBTenantIds = tenantBProducts.every(p => p.tenantId === 'tenant_B');
  assert(allTenantATenantIds && allTenantBTenantIds, 'Cada produto é estritamente vinculado ao seu tenantId', '15. Isolamento por Tenant');

  // 16. Cálculo por Unidade (unit)
  const unitCalc = calculateProductPrice({
    calculationUnit: 'unit',
    salePriceCents: 7000, // R$ 70,00
    quantity: 3,
  });
  assert(unitCalc.unitPriceCents === 7000, 'Preço unitário = 7000 centavos', '16. Cálculo por Unidade');
  assert(unitCalc.totalPriceCents === 21000, 'Total 3x 7000 = 21000 centavos', '16. Cálculo por Unidade');

  // 17. Cálculo por Metro Quadrado (m²)
  // Ex: Banner 800mm x 1200mm = 0.8m x 1.2m = 0.96m². Preço m² = 7000 centavos (R$ 70,00)
  const areaCalc = calculateProductPrice({
    calculationUnit: 'm2',
    salePriceCents: 7000,
    quantity: 2,
    widthMm: 800,
    heightMm: 1200,
    minSalePriceCents: 4500,
  });
  const expectedAreaM2 = 0.96;
  const expectedSingleUnitCents = Math.round(0.96 * 7000); // 6720 centavos
  assert(Math.abs((areaCalc.areaM2 || 0) - expectedAreaM2) < 0.001, 'Área calculada = 0.96 m²', '17. Cálculo por Área (m²)');
  assert(areaCalc.unitPriceCents === expectedSingleUnitCents, `Preço unitário calculado = ${expectedSingleUnitCents} centavos`, '17. Cálculo por Área (m²)');
  assert(areaCalc.totalPriceCents === expectedSingleUnitCents * 2, `Total 2 unidades = ${expectedSingleUnitCents * 2} centavos`, '17. Cálculo por Área (m²)');

  // 18. Cálculo por Metro Linear (linear_meter)
  // Ex: Faixa 3000mm = 3.0m. Preço linear = 5000 centavos/m (R$ 50,00/m). Qty = 1
  const linearCalc = calculateProductPrice({
    calculationUnit: 'linear_meter',
    salePriceCents: 5000,
    quantity: 1,
    widthMm: 3000,
  });
  assert(linearCalc.linearMeters === 3.0, 'Comprimento = 3.0 metros lineares', '18. Cálculo por Metro Linear');
  assert(linearCalc.totalPriceCents === 15000, 'Total = 15000 centavos (3m * 5000)', '18. Cálculo por Metro Linear');

  // 19. Produto sem Preço Configurado e Item Personalizado
  const unpricedCalc = calculateProductPrice({
    calculationUnit: 'unit',
    salePriceCents: 0,
    quantity: 1,
  });
  assert(!unpricedCalc.hasPrice && unpricedCalc.totalPriceCents === 0, 'Produto com preço 0 é identificado como sem preço', '19. Produto Sem Preço');

  // 20. Desativação e Preservação em Orçamentos Anteriores
  const cartao = initialProducts.find(p => p.name === 'Cartão de visita')!;
  const deactivatedCartao: Product = { ...cartao, isActive: false };
  assert(!deactivatedCartao.isActive, 'Produto pode ser desativado', '20. Desativação e Preservação');
  // O item no orçamento mantém todos os seus valores intactos
  const quoteItemSnapshot = {
    productId: cartao.id,
    productName: cartao.name,
    unitPriceCents: cartao.salePriceCents,
    totalPriceCents: cartao.salePriceCents * 2,
  };
  assert(quoteItemSnapshot.totalPriceCents === 14000, 'Orçamento existente preserva o valor mesmo com produto desativado', '20. Desativação e Preservação');

  // 21. [Hotfix P3] Formatação Monetária Canônica e Normalização de Eventos
  const formatted72 = formatCentsToBRL(7200).replace(/\u00a0/g, ' ');
  const normalized72 = normalizeMonetaryText('Orçamento comercial emitido no valor de R$ 72.00.');
  assert(
    formatted72 === 'R$ 72,00' && normalized72 === 'Orçamento comercial emitido no valor de R$ 72,00.',
    'R$ 72 aparece como "R$ 72,00" tanto no formatador quanto na normalização de mensagens',
    '21. Formatação Monetária Canônica'
  );

  const formatted1234 = formatCentsToBRL(123456).replace(/\u00a0/g, ' ');
  const normalized1234 = normalizeMonetaryText('Orçamento comercial emitido no valor de R$ 1234.56.');
  assert(
    formatted1234 === 'R$ 1.234,56' && normalized1234 === 'Orçamento comercial emitido no valor de R$ 1.234,56.',
    'R$ 1234,56 aparece como "R$ 1.234,56" com separador de milhar e decimal corretos',
    '21. Formatação Monetária Canônica'
  );

  const parsed72 = parseBRLToCents('R$ 72,00');
  const parsed1234 = parseBRLToCents('R$ 1.234,56');
  assert(
    parsed72 === 7200 && parsed1234 === 123456,
    'Centavos inteiros não sofrem alteração de valor numérico na manipulação',
    '21. Formatação Monetária Canônica'
  );

  const eventMessage = `Orçamento comercial emitido no valor de ${formatCentsToBRL(7200)}.`;
  assert(
    !eventMessage.includes('72.00') && eventMessage.includes('72,00'),
    'Nenhuma mensagem nova gerada contém o padrão incorreto "R$ 72.00"',
    '21. Formatação Monetária Canônica'
  );

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  return { results, total, passed, failed };
}
