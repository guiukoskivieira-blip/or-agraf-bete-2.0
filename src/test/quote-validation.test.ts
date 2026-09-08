/**
 * @file quote-validation.test.ts
 * @description Testes unitários e de domínio para a validação de formulário de novo orçamento
 * @project OrçaGraf - Hotfix Validação de Orçamento Comercial
 */

import { validateQuoteForm, QuoteFormItem, QuoteFormValidationParams } from '../domain/quote-validation';
import { Finishing } from '../types/product';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runQuoteValidationTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Validação de Orçamento Comercial (Hotfix)';

  const record = (testName: string, fn: () => void) => {
    try {
      fn();
      results.push({ suiteName, testName, passed: true });
    } catch (err: any) {
      results.push({ suiteName, testName, passed: false, error: err.message || String(err) });
    }
  };

  const sampleCatalogFinishings: Finishing[] = [
    {
      id: 'fin_verniz_local',
      tenantId: 'tenant_1',
      name: 'Verniz Localizado UV',
      pricingBasis: 'FIXED',
      priceCents: 5000,
      priceStatus: 'CONFIGURED',
      compatibleProductIds: ['prod_cartao_visita'],
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'fin_sem_preco',
      tenantId: 'tenant_1',
      name: 'Refile Especial',
      pricingBasis: 'FIXED',
      priceCents: 0,
      priceStatus: 'NOT_CONFIGURED',
      compatibleProductIds: ['prod_cartao_visita'],
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  // 1. Orçamento mínimo válido
  record('1. Orçamento comercial mínimo válido é aprovado na validação', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Gráfica Express Ltda',
      items: [
        {
          id: 'item_1',
          productName: 'Cartão de Visita 4x4',
          pricingMode: 'UNIT',
          quantity: 100,
          unitPriceCents: 50,
          totalPriceCents: 5000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (!res.isValid) {
      throw new Error(`Esperava ser válido, mas falhou: ${res.message}`);
    }
    if (!res.sanitizedItems || res.sanitizedItems[0].productName !== 'Cartão de Visita 4x4') {
      throw new Error('sanitizedItems não retornou os itens corretos');
    }
  });

  // 2. Cliente ausente
  record('2. Nome do cliente ausente ou em branco falha com erro específico', () => {
    const params: QuoteFormValidationParams = {
      customerName: '   ',
      items: [
        {
          id: 'item_1',
          productName: 'Banner 440g',
          pricingMode: 'SQUARE_METER',
          quantity: 1,
          widthMm: 1000,
          heightMm: 2000,
          unitPriceCents: 8000,
          totalPriceCents: 8000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por cliente ausente');
    }
    if (res.field !== 'customerName') {
      throw new Error(`Campo esperado customerName, obtido: ${res.field}`);
    }
    if (res.message !== 'Informe o nome do cliente.') {
      throw new Error(`Mensagem inesperada: ${res.message}`);
    }
  });

  // 3. Itens ausentes
  record('3. Lista de itens vazia falha com erro específico', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por itens vazios');
    }
    if (res.field !== 'items') {
      throw new Error(`Campo esperado items, obtido: ${res.field}`);
    }
  });

  // 4. Item sem identificação/nome
  record('4. Item sem nome e sem notas falha especificando o número do item', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: '',
          pricingMode: 'UNIT',
          quantity: 10,
          unitPriceCents: 1000,
          totalPriceCents: 10000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por nome do item vazio');
    }
    if (res.field !== 'items[0].productName') {
      throw new Error(`Campo esperado items[0].productName, obtido: ${res.field}`);
    }
    if (!res.message?.includes('item 1')) {
      throw new Error(`Mensagem não contém número do item: ${res.message}`);
    }
  });

  // 5. Item personalizado sem nome mas com observações técnicas é normalizado e aprovado
  record('5. Item personalizado sem nome mas com observações técnicas é recuperado e aprovado', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: '',
          notes: 'Adesivo Vinil Fosco Impresso com Recorte',
          pricingMode: 'UNIT',
          quantity: 5,
          unitPriceCents: 2000,
          totalPriceCents: 10000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (!res.isValid) {
      throw new Error(`Deveria ter aprovado com fallback para notes: ${res.message}`);
    }
    if (res.sanitizedItems?.[0].productName !== 'Adesivo Vinil Fosco Impresso com Recorte') {
      throw new Error(`productName não foi preenchido corretamente: ${res.sanitizedItems?.[0].productName}`);
    }
  });

  // 6. Quantidade inválida
  record('6. Quantidade zero ou negativa falha com identificação do item', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Flyer A5',
          pricingMode: 'UNIT',
          quantity: 0,
          unitPriceCents: 50,
          totalPriceCents: 0,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por quantidade inválida');
    }
    if (res.field !== 'items[0].quantity') {
      throw new Error(`Campo esperado items[0].quantity, obtido: ${res.field}`);
    }
  });

  // 7. Preço zero ou negativo
  record('7. Preço unitário zero falha especificando o item', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Encarte Especial',
          pricingMode: 'UNIT',
          quantity: 10,
          unitPriceCents: 0,
          totalPriceCents: 0,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por preço zero');
    }
    if (res.field !== 'items[0].unitPriceCents') {
      throw new Error(`Campo esperado items[0].unitPriceCents, obtido: ${res.field}`);
    }
  });

  // 8. Modalidade LOT com lotSize inválido
  record('8. Modalidade LOT com tamanho do lote <= 0 falha com mensagem clara', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Milheiro Cartão',
          pricingMode: 'LOT',
          quantity: 1,
          lotSize: 0,
          unitPriceCents: 15000,
          totalPriceCents: 15000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por lotSize inválido');
    }
    if (res.field !== 'items[0].lotSize') {
      throw new Error(`Campo esperado items[0].lotSize, obtido: ${res.field}`);
    }
  });

  // 9. Modalidade SQUARE_METER com dimensões zeradas
  record('9. Modalidade SQUARE_METER sem largura ou altura falha especificando dimensões', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Painel Lona',
          pricingMode: 'SQUARE_METER',
          quantity: 1,
          widthMm: 0,
          heightMm: 1200,
          unitPriceCents: 9000,
          totalPriceCents: 9000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por largura zerada');
    }
    if (res.field !== 'items[0].dimensions') {
      throw new Error(`Campo esperado items[0].dimensions, obtido: ${res.field}`);
    }
  });

  // 10. Modalidade LINEAR_METER com comprimento inválido
  record('10. Modalidade LINEAR_METER sem comprimento válido falha', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Perfil de Alumínio',
          pricingMode: 'LINEAR_METER',
          quantity: 1,
          lengthMeters: 0,
          unitPriceCents: 3500,
          totalPriceCents: 3500,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado por comprimento zerado');
    }
    if (res.field !== 'items[0].lengthMeters') {
      throw new Error(`Campo esperado items[0].lengthMeters, obtido: ${res.field}`);
    }
  });

  // 11. Campos comerciais opcionais ausentes passam com 100% de sucesso
  record('11. Todos os campos opcionais vazios passam com sucesso', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Balcão Sem Cadastro',
      customerContact: '',
      customerDocument: '',
      customerEmail: '',
      items: [
        {
          id: 'item_1',
          productName: 'Bloco de Pedidos',
          pricingMode: 'UNIT',
          quantity: 5,
          unitPriceCents: 1200,
          totalPriceCents: 6000,
          materialName: '',
          notes: '',
          finishings: [],
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (!res.isValid) {
      throw new Error(`Orçamento com campos opcionais vazios deveria ser válido: ${res.message}`);
    }
  });

  // 12. Acabamento selecionado sem preço bloqueia; acabamento não selecionado não bloqueia
  record('12. Acabamento não selecionado mesmo sem preço não bloqueia', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Cartão de Visita',
          pricingMode: 'UNIT',
          quantity: 100,
          unitPriceCents: 50,
          totalPriceCents: 5000,
          finishings: [
            {
              finishingId: 'fin_sem_preco',
              name: 'Refile Especial',
              selected: false,
              priceStatus: 'NOT_CONFIGURED',
            },
          ],
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (!res.isValid) {
      throw new Error(`Acabamento desmarcado não deveria bloquear: ${res.message}`);
    }
  });

  // 13. Acabamento selecionado sem preço bloqueia com mensagem específica
  record('13. Acabamento selecionado sem preço bloqueia com mensagem explicativa', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Cartão de Visita',
          pricingMode: 'UNIT',
          quantity: 100,
          unitPriceCents: 50,
          totalPriceCents: 5000,
          finishings: [
            {
              finishingId: 'fin_sem_preco',
              name: 'Refile Especial',
              selected: true,
              priceStatus: 'NOT_CONFIGURED',
            },
          ],
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter bloqueado acabamento selecionado sem preço');
    }
    if (!res.message?.includes('Refile Especial')) {
      throw new Error(`Mensagem não cita acabamento: ${res.message}`);
    }
  });

  // 14. Segundo item com erro identifica item 2
  record('14. Erro no segundo item aponta explicitamente "item 2"', () => {
    const params: QuoteFormValidationParams = {
      customerName: 'Cliente Teste',
      items: [
        {
          id: 'item_1',
          productName: 'Item Um Válido',
          pricingMode: 'UNIT',
          quantity: 10,
          unitPriceCents: 100,
          totalPriceCents: 1000,
        },
        {
          id: 'item_2',
          productName: '',
          pricingMode: 'UNIT',
          quantity: 5,
          unitPriceCents: 200,
          totalPriceCents: 1000,
        },
      ],
    };

    const res = validateQuoteForm(params);
    if (res.isValid) {
      throw new Error('Deveria ter falhado no item 2');
    }
    if (res.field !== 'items[1].productName') {
      throw new Error(`Campo esperado items[1].productName, obtido: ${res.field}`);
    }
    if (!res.message?.includes('item 2')) {
      throw new Error(`Mensagem deveria citar item 2: ${res.message}`);
    }
  });

  return results;
}
