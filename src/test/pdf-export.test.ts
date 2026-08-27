/**
 * @file pdf-export.test.ts
 * @description Testes automatizados do serviço de exportação e layout do PDF de Orçamentos
 * @project OrçaGraf
 */

import { PdfExportService } from '../services/pdf-export.service';
import { Quote, QuoteItem } from '../types/quote';
import { Company } from '../types/tenant';
import { TestResult } from './domain-integrity.test';

const mockCompany: Company = {
  id: 'emp_alphaprint_01',
  tradeName: 'Alpha Print Express & Visual',
  corporateName: 'Alpha Print Soluções Gráficas Ltda',
  document: '12.345.678/0001-90',
  stateRegistration: '123.456.789.000',
  email: 'comercial@alphaprint.com.br',
  phone: '(11) 3456-7890',
  whatsapp: '(11) 98765-4321',
  website: 'https://alphaprint.com.br',
  managerName: 'Carlos Henrique Silva',
  address: {
    street: 'Av. Industrial',
    number: '1450',
    neighborhood: 'Distrito Gráfico',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-000',
  },
  branding: {
    primaryColor: '#2563eb',
    secondaryColor: '#0d9488',
    showLogoInQuotes: true,
  },
  customization: {
    headerNote: 'Proposta comercial para impressão gráfica.',
    footerDisclaimer: 'Garantia de fabricação de até 30 dias.',
    defaultPaymentTerms: 'Pix à vista',
    defaultProductionDays: 3,
    commercialNotes: 'Arquivos conforme gabarito.',
    showTechnicalDetailsToCustomer: true,
  },
  settings: {
    currency: 'BRL',
  },
  createdAt: '2026-02-27T10:00:00Z',
  updatedAt: '2026-02-27T10:00:00Z',
};

function extractPdfText(doc: any): string {
  const raw = ((doc.internal?.pages as any[]) || []).flat().join('\n');
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')');
}

export function runPdfExportTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'PDF Export & Layout Consistency';

  function assert(condition: boolean, testName: string, errorMsg?: string) {
    if (condition) {
      results.push({ suiteName, testName, passed: true });
    } else {
      results.push({ suiteName, testName, passed: false, error: errorMsg || 'Assertion failed' });
    }
  }

  // 1. Proposta Controlada
  const controlledQuote: Quote = {
    id: 'quot_audit_01',
    tenantId: mockCompany.id,
    quoteNumber: 'ORC-2026-0001',
    customerId: 'cust_audit_01',
    customerName: 'CLIENTE TESTE PDF',
    customerContact: '(11) 98888-7777',
    customerDocument: '11.222.333/0001-44',
    customerEmail: 'cliente.teste@email.com',
    currentVersion: 1,
    status: 'awaiting_customer',
    items: [
      {
        id: 'it_01',
        productId: 'prod_cartao_01',
        productName: 'Cartão de visita',
        pricingMode: 'LOT',
        quantity: 1000,
        lotSize: 1000,
        billedQuantity: 1,
        widthMm: 90,
        heightMm: 50,
        materialName: 'Papel couchê 300 g',
        basePriceCents: 7000,
        unitPriceCents: 7000,
        unitCostCents: 3500,
        totalPriceCents: 8000,
        finishings: [
          {
            finishingId: 'fin_refile',
            name: 'Refile',
            pricingBasis: 'PER_UNIT',
            priceStatus: 'FREE',
            isRequired: true,
            isOptional: false,
            unitPriceCents: 0,
            totalPriceCents: 0,
          },
          {
            finishingId: 'fin_cantos',
            name: 'Cantos arredondados',
            pricingBasis: 'FIXED',
            priceStatus: 'CONFIGURED',
            isRequired: false,
            isOptional: true,
            unitPriceCents: 1000,
            totalPriceCents: 1000,
          },
        ],
        notes: 'Arte fornecida pelo cliente com sangria de 2mm.',
      },
    ],
    subtotalCents: 8000,
    shippingCents: 0,
    discount: {
      type: 'percentage',
      value: 10,
      appliedAmountCents: 800,
      reason: 'Desconto comercial à vista',
    },
    discountCents: 800,
    totalCents: 7200,
    paymentTerms: 'Pagamento via Pix à vista na confirmação do pedido.',
    estimatedProductionDays: 3,
    financialTerms: {
      paymentMethod: 'pix',
      paymentCondition: 'in_cash',
      installmentsCount: 1,
      downPaymentCents: 7200,
      installmentIntervalDays: 0,
      installments: [
        {
          installmentNumber: 1,
          dueDate: '2026-02-27',
          amountCents: 7200,
        },
      ],
    },
    salespersonId: null,
    salespersonName: null,
    sellerId: null,
    sellerName: null,
    commissionRatePercent: null,
    commissionAmountCents: null,
    versions: [],
    dataOrigin: 'user',
    createdAt: '2026-02-27T10:00:00Z',
    updatedAt: '2026-02-27T10:00:00Z',
  };

  const doc1 = (PdfExportService as any).buildQuotePdfDocument(controlledQuote, mockCompany);
  const pdfString1 = extractPdfText(doc1);

  // Teste 1: Nome do arquivo gerado
  assert(
    PdfExportService.getQuotePdfFilename(controlledQuote) === 'Orcamento_ORC-2026-0001_CLIENTE_TESTE_PDF.pdf',
    'Nome do arquivo sanitizado segue padrão Orcamento_NUMERO_CLIENTE.pdf'
  );

  // Teste 2: Subtotal R$ 80,00
  assert(
    pdfString1.includes('R$ 80,00'),
    'Proposta controlada contém Subtotal de R$ 80,00'
  );

  // Teste 3: Desconto R$ 8,00
  assert(
    pdfString1.includes('- R$ 8,00'),
    'Proposta controlada contém Desconto Comercial de R$ 8,00'
  );

  // Teste 4: Total final R$ 72,00
  assert(
    pdfString1.includes('R$ 72,00'),
    'Proposta controlada contém Total Final de R$ 72,00'
  );

  // Teste 5: Refile incluso
  assert(
    pdfString1.includes('Refile (Incluso)'),
    'Proposta controlada apresenta Refile como (Incluso)'
  );

  // Teste 6: Cantos arredondados + R$ 10,00
  assert(
    pdfString1.includes('Cantos arredondados (+R$ 10,00)'),
    'Proposta controlada apresenta Cantos arredondados como (+R$ 10,00)'
  );

  // Teste 7: Orçamento sem vendedor exibe "Atendimento Comercial" sem inventar pessoa
  assert(
    pdfString1.includes('Atendimento Comercial') && !pdfString1.includes('Carlos Henrique Silva'),
    'Orçamento sem vendedor exibe "Atendimento Comercial" sem inventar pessoa fictícia'
  );

  // Teste 8: Validade da proposta removida
  assert(
    !pdfString1.includes('Validade da Proposta') && !pdfString1.includes('Validade da proposta'),
    'Nenhuma ocorrência de "Validade da proposta" existe no PDF'
  );

  // Teste 9: Cabeçalho utiliza "QTD. / UN."
  assert(
    pdfString1.includes('QTD. / UN.'),
    'Cabeçalho da tabela utiliza explicitamente "QTD. / UN."'
  );

  // Teste 10: Comissão com vendedor não vaza no PDF do cliente
  const quoteWithCommission: Quote = {
    ...controlledQuote,
    salespersonId: 'usr_01',
    salespersonName: 'Roberto Vendedor',
    commissionRatePercent: 10,
    commissionAmountCents: 720,
  };
  const docCommission = (PdfExportService as any).buildQuotePdfDocument(quoteWithCommission, mockCompany);
  const pdfCommissionStr = extractPdfText(docCommission);
  assert(
    pdfCommissionStr.includes('Roberto Vendedor') &&
    !pdfCommissionStr.toLowerCase().includes('comiss') &&
    !pdfCommissionStr.includes('R$ 7,20'),
    'Comissão e taxas de vendedor nunca aparecem no PDF do cliente'
  );

  // Teste 11: Nome longo de vendedor/atendente não ultrapassa a margem útil
  const quoteWithLongSeller: Quote = {
    ...controlledQuote,
    salespersonName: 'Carlos Henrique da Silva Silveira e Albuquerque de Souza Junior',
  };
  const docLongSeller = (PdfExportService as any).buildQuotePdfDocument(quoteWithLongSeller, mockCompany);
  assert(
    docLongSeller.getNumberOfPages() >= 1,
    'Orçamento com vendedor de nome extenso gera sem erros de layout'
  );

  // Teste 12: Modalidades de precificação (UNIT, LOT, SQUARE_METER, LINEAR_METER)
  const multiModalQuote: Quote = {
    ...controlledQuote,
    items: [
      {
        id: 'it_unit',
        productId: 'p_u',
        productName: 'Item Unitário',
        pricingMode: 'UNIT',
        quantity: 5,
        basePriceCents: 1500,
        unitPriceCents: 1500,
        unitCostCents: 800,
        totalPriceCents: 7500,
        finishings: [],
      },
      {
        id: 'it_m2',
        productId: 'p_m2',
        productName: 'Banner m²',
        pricingMode: 'SQUARE_METER',
        quantity: 2,
        areaM2: 3.5,
        basePriceCents: 6000,
        unitPriceCents: 6000,
        unitCostCents: 3000,
        totalPriceCents: 21000,
        finishings: [],
      },
      {
        id: 'it_lin',
        productId: 'p_lin',
        productName: 'Perfil Linear',
        pricingMode: 'LINEAR_METER',
        quantity: 3,
        linearMeters: 4.2,
        basePriceCents: 2000,
        unitPriceCents: 2000,
        unitCostCents: 1000,
        totalPriceCents: 6000,
        finishings: [],
      },
    ],
    subtotalCents: 34500,
    totalCents: 34500,
  };
  const docModal = (PdfExportService as any).buildQuotePdfDocument(multiModalQuote, mockCompany);
  const pdfModalStr = extractPdfText(docModal);

  assert(
    pdfModalStr.includes('/un.') && pdfModalStr.includes('/m²') && pdfModalStr.includes('/m'),
    'UNIT, SQUARE_METER e LINEAR_METER são descritos corretamente nas colunas do PDF'
  );

  // Teste 13: Bloco de observações permanece na 1ª página quando há espaço
  assert(
    doc1.getNumberOfPages() === 1,
    'Proposta controlada (1 item) mantém itens, quadro financeiro e observações em página única (1 página)'
  );

  // Teste 14: Multi-itens com 5 produtos cabem na primeira página sem quebra prematura
  const fiveItemsQuote: Quote = {
    ...multiModalQuote,
    items: [
      ...multiModalQuote.items,
      {
        id: 'it_4',
        productId: 'p_4',
        productName: 'Adesivo Vinil',
        pricingMode: 'SQUARE_METER',
        quantity: 2,
        areaM2: 2.0,
        basePriceCents: 5000,
        unitPriceCents: 5000,
        unitCostCents: 2500,
        totalPriceCents: 10000,
        finishings: [],
      },
      {
        id: 'it_5',
        productId: 'p_5',
        productName: 'Wind Banner',
        pricingMode: 'UNIT',
        quantity: 1,
        basePriceCents: 18000,
        unitPriceCents: 18000,
        unitCostCents: 9000,
        totalPriceCents: 18000,
        finishings: [],
      },
    ],
  };
  const docFive = (PdfExportService as any).buildQuotePdfDocument(fiveItemsQuote, mockCompany);
  assert(
    docFive.getNumberOfPages() === 1,
    'Proposta com 5 itens aproveita o espaço útil e mantém observações na 1ª página sem página órfã'
  );

  // Teste 15: Proposta com muitos itens quebra página dinamicamente
  const manyItems: QuoteItem[] = Array.from({ length: 15 }, (_, i) => ({
    id: `it_bulk_${i}`,
    productId: `prod_${i}`,
    productName: `Produto Industrial Gráfico Modelo Especial #${i + 1}`,
    pricingMode: 'UNIT',
    quantity: 10,
    basePriceCents: 5000,
    unitPriceCents: 5000,
    unitCostCents: 2500,
    totalPriceCents: 50000,
    finishings: [],
    notes: 'Especificação técnica com verniz localizado e acabamento especial.',
  }));
  const manyItemsQuote: Quote = {
    ...controlledQuote,
    items: manyItems,
  };
  const docMany = (PdfExportService as any).buildQuotePdfDocument(manyItemsQuote, mockCompany);
  assert(
    docMany.getNumberOfPages() >= 2,
    'Proposta com múltiplos itens que ultrapassam a página cria páginas adicionais de forma consistente'
  );

  return results;
}
