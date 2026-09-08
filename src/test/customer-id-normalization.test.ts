/**
 * @file customer-id-normalization.test.ts
 * @description Testes direcionados para normalização de customer_id e integridade de UUID em orçamentos
 * @project OrçaGraf - Hotfix Customer ID Temporário
 */

import { normalizeUuid } from '../domain/quote-validation';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

/**
 * Simula a montagem do payload de cabeçalho da RPC create_quote_atomic / update_quote_atomic
 */
export function buildRpcQuoteHeaderPayload(quoteInput: {
  customerId?: string | null;
  customerName?: string | null;
  customerDocument?: string | null;
  customerContact?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
}) {
  return {
    customer_id: normalizeUuid(quoteInput.customerId),
    customer_name: quoteInput.customerName || 'Consumidor Final',
    customer_document: quoteInput.customerDocument || null,
    customer_contact: quoteInput.customerContact || null,
    customer_email: quoteInput.customerEmail || null,
    customer_phone: quoteInput.customerPhone || null,
    seller_id: normalizeUuid(quoteInput.sellerId),
    seller_name: quoteInput.sellerName || null,
  };
}

export function runCustomerIdNormalizationTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Normalização de Customer ID e Snapshot (Hotfix)';

  const record = (testName: string, fn: () => void) => {
    try {
      fn();
      results.push({ suiteName, testName, passed: true });
    } catch (err: any) {
      results.push({ suiteName, testName, passed: false, error: err.message || String(err) });
    }
  };

  const validUuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const realSellerUuid = '987fcdeb-51a2-43d7-9876-ba0987654321';

  // 1. Cliente só com nome → customer_id null
  record('1. Cliente só com nome → customer_id enviado como null para RPC', () => {
    const payload = buildRpcQuoteHeaderPayload({
      customerId: undefined,
      customerName: 'Cliente Balcão Sem Cadastro',
    });

    if (payload.customer_id !== null) {
      throw new Error(`Esperava customer_id === null, obtido: ${payload.customer_id}`);
    }
    if (payload.customer_name !== 'Cliente Balcão Sem Cadastro') {
      throw new Error(`Snapshot customer_name incorreto: ${payload.customer_name}`);
    }
  });

  // 2. Cliente temporário cust_* → customer_id null
  record('2. Cliente temporário com ID sintético (cust_1788871940939, temp_123) → customer_id normalizado para null', () => {
    const syntheticIds = [
      'cust_1788871940939',
      'cust_01',
      'temp_abc',
      'local_999',
      '12345',
      'invalid-uuid-format',
    ];

    for (const synId of syntheticIds) {
      const payload = buildRpcQuoteHeaderPayload({
        customerId: synId,
        customerName: 'Cliente com ID Temporário',
      });

      if (payload.customer_id !== null) {
        throw new Error(`ID sintético '${synId}' deveria ter sido normalizado para null, obtido: ${payload.customer_id}`);
      }
    }
  });

  // 3. Cliente cadastrado com UUID → UUID preservado
  record('3. Cliente cadastrado com UUID válido → UUID é estritamente preservado', () => {
    const payload = buildRpcQuoteHeaderPayload({
      customerId: validUuid,
      customerName: 'Empresa Alpha Ltda',
      customerDocument: '12.345.678/0001-90',
    });

    if (payload.customer_id !== validUuid) {
      throw new Error(`UUID válido deveria ser preservado. Esperado: ${validUuid}, obtido: ${payload.customer_id}`);
    }
    if (payload.customer_name !== 'Empresa Alpha Ltda') {
      throw new Error(`Nome do cliente divergente: ${payload.customer_name}`);
    }
    if (payload.customer_document !== '12.345.678/0001-90') {
      throw new Error(`Documento divergente: ${payload.customer_document}`);
    }
  });

  // 4. Snapshot customer_name preservado
  record('4. Snapshot do cliente (nome, documento, contato, email) é preservado integralmente', () => {
    const payload = buildRpcQuoteHeaderPayload({
      customerId: null,
      customerName: 'João Gráfica Rápida',
      customerDocument: '123.456.789-00',
      customerContact: 'João Silva',
      customerEmail: 'joao@grafica.com.br',
    });

    if (payload.customer_id !== null) {
      throw new Error('customer_id deve ser null');
    }
    if (payload.customer_name !== 'João Gráfica Rápida') {
      throw new Error('customer_name não foi preservado');
    }
    if (payload.customer_document !== '123.456.789-00') {
      throw new Error('customer_document não foi preservado');
    }
    if (payload.customer_contact !== 'João Silva') {
      throw new Error('customer_contact não foi preservado');
    }
    if (payload.customer_email !== 'joao@grafica.com.br') {
      throw new Error('customer_email não foi preservado');
    }
  });

  // 5. Campos opcionais vazios não bloqueiam
  record('5. Campos opcionais vazios resultam em null no payload sem gerar falhas', () => {
    const payload = buildRpcQuoteHeaderPayload({
      customerName: 'Cliente Sem Dados Opcionais',
      customerDocument: '',
      customerContact: '',
      customerEmail: '',
      sellerId: '',
    });

    if (payload.customer_id !== null) {
      throw new Error('customer_id deve ser null');
    }
    if (payload.customer_document !== null) {
      throw new Error('customer_document vazio deve ser null');
    }
    if (payload.customer_contact !== null) {
      throw new Error('customer_contact vazio deve ser null');
    }
    if (payload.customer_email !== null) {
      throw new Error('customer_email vazio deve ser null');
    }
    if (payload.seller_id !== null) {
      throw new Error('seller_id vazio deve ser null');
    }
  });

  // 6. Nenhum ID temporário chega ao payload RPC
  record('6. Auditoria de segurança: nenhum ID temporário ou sintético de seller/customer/product chega à RPC', () => {
    const payload = buildRpcQuoteHeaderPayload({
      customerId: 'cust_999_demo',
      sellerId: 'user_123_temp',
      customerName: 'Cliente Auditoria',
    });

    if (payload.customer_id !== null) {
      throw new Error(`ID de cliente temporário vazou para o payload: ${payload.customer_id}`);
    }
    if (payload.seller_id !== null) {
      throw new Error(`ID de vendedor temporário vazou para o payload: ${payload.seller_id}`);
    }

    // Com UUID real do vendedor
    const payloadWithRealSeller = buildRpcQuoteHeaderPayload({
      customerId: 'cust_999_demo',
      sellerId: realSellerUuid,
      customerName: 'Cliente Auditoria',
    });

    if (payloadWithRealSeller.customer_id !== null) {
      throw new Error('customer_id deve ser null');
    }
    if (payloadWithRealSeller.seller_id !== realSellerUuid) {
      throw new Error(`seller_id UUID válido foi descartado: ${payloadWithRealSeller.seller_id}`);
    }
  });

  return results;
}
