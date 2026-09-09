/**
 * @file commission-persistence.test.ts
 * @description Testes de persistência de comissão no payload do orçamento (Hotfix P1-02)
 * @project OrçaGraf
 *
 * Verifica que commission_rate_percent e commission_amount_cents
 * são corretamente incluídos no quotePayload enviado à RPC create_quote_atomic,
 * e que seller e valores comerciais continuam inalterados.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

/**
 * Simula a construção do quotePayload exatamente como em QuoteRepository.createQuote.
 * Reproduz SOMENTE a lógica de montagem do payload — sem Supabase, sem rede.
 */
function buildQuotePayload(quote: Record<string, unknown>): Record<string, unknown> {
  // Reproduz normalizeUuid inline (sem import circular)
  const normalizeUuid = (val: unknown): string | null => {
    if (!val || typeof val !== 'string') return null;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return UUID_REGEX.test(val) ? val : null;
  };

  return {
    customer_id: normalizeUuid(quote.customerId as string),
    customer_name: (quote.customerName as string) || 'Consumidor Final',
    customer_document: (quote.customerDocument as string) || null,
    customer_contact: (quote.customerContact as string) || null,
    customer_email: (quote.customerEmail as string) || null,
    subtotal_cents: (quote.subtotalCents as number) || 0,
    discount_type: ((quote.discount as Record<string, unknown>)?.type as string) || 'none',
    discount_value: ((quote.discount as Record<string, unknown>)?.value as number) || 0,
    discount_applied_cents: (quote.discountCents as number) || 0,
    discount_reason: ((quote.discount as Record<string, unknown>)?.reason as string) || null,
    total_cents: (quote.totalCents as number) || 0,
    down_payment_cents: ((quote.financialTerms as Record<string, unknown>)?.downPaymentCents as number) || 0,
    payment_method: ((quote.financialTerms as Record<string, unknown>)?.paymentMethod as string) || 'to_be_defined',
    payment_condition: ((quote.financialTerms as Record<string, unknown>)?.paymentCondition as string) || 'to_be_defined',
    installments_count: ((quote.financialTerms as Record<string, unknown>)?.installmentsCount as number) || 1,
    installments_json: ((quote.financialTerms as Record<string, unknown>)?.installments as unknown[]) || [],
    production_days: (quote.estimatedProductionDays as number) || 3,
    internal_notes: (quote.paymentTerms as string) || null,
    customer_notes: null,
    seller_id: normalizeUuid((quote.sellerId as string) || (quote.salespersonId as string)),
    seller_name: (quote.sellerName as string) || (quote.salespersonName as string) || null,
    commission_rate_percent: (quote.commissionRatePercent as number) ?? null,
    commission_amount_cents: (quote.commissionAmountCents as number) ?? null,
  };
}

export function runCommissionPersistenceTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Persistência de Comissão no Payload (Hotfix P1-02)';

  // ──────────────────────────────────────────────────
  // CASO A: Comissão definida (5%, R$ 11,25)
  // ──────────────────────────────────────────────────
  try {
    const quoteWithCommission = {
      customerId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      customerName: 'Gráfica Exemplo',
      subtotalCents: 22500,
      totalCents: 22500,
      discount: { type: 'none', value: 0, appliedAmountCents: 0 },
      discountCents: 0,
      financialTerms: { paymentMethod: 'pix', paymentCondition: 'in_cash', installmentsCount: 1, downPaymentCents: 0, installments: [] },
      sellerId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      sellerName: 'João Vendedor',
      commissionRatePercent: 5,
      commissionAmountCents: 1125,
    };
    const payload = buildQuotePayload(quoteWithCommission);

    results.push({
      suiteName,
      testName: 'A1. quotePayload inclui commission_rate_percent = 5',
      passed: payload.commission_rate_percent === 5,
      error: payload.commission_rate_percent !== 5 ? `Esperado 5, encontrado ${payload.commission_rate_percent}` : undefined,
    });

    results.push({
      suiteName,
      testName: 'A2. quotePayload inclui commission_amount_cents = 1125',
      passed: payload.commission_amount_cents === 1125,
      error: payload.commission_amount_cents !== 1125 ? `Esperado 1125, encontrado ${payload.commission_amount_cents}` : undefined,
    });
  } catch (err: unknown) {
    results.push({ suiteName, testName: 'A. Comissão definida', passed: false, error: String(err) });
  }

  // ──────────────────────────────────────────────────
  // CASO B: Sem comissão (null/null)
  // ──────────────────────────────────────────────────
  try {
    const quoteWithoutCommission = {
      customerId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      customerName: 'Gráfica Sem Comissão',
      subtotalCents: 10000,
      totalCents: 10000,
      discount: { type: 'none', value: 0, appliedAmountCents: 0 },
      discountCents: 0,
      financialTerms: { paymentMethod: 'to_be_defined', paymentCondition: 'to_be_defined', installmentsCount: 1, downPaymentCents: 0, installments: [] },
      sellerId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      sellerName: 'Maria Vendedora',
      commissionRatePercent: null,
      commissionAmountCents: null,
    };
    const payload = buildQuotePayload(quoteWithoutCommission);

    results.push({
      suiteName,
      testName: 'B1. Sem comissão: commission_rate_percent = null',
      passed: payload.commission_rate_percent === null,
      error: payload.commission_rate_percent !== null ? `Esperado null, encontrado ${payload.commission_rate_percent}` : undefined,
    });

    results.push({
      suiteName,
      testName: 'B2. Sem comissão: commission_amount_cents = null',
      passed: payload.commission_amount_cents === null,
      error: payload.commission_amount_cents !== null ? `Esperado null, encontrado ${payload.commission_amount_cents}` : undefined,
    });
  } catch (err: unknown) {
    results.push({ suiteName, testName: 'B. Sem comissão', passed: false, error: String(err) });
  }

  // ──────────────────────────────────────────────────
  // CASO C: Seller permanece preservado
  // ──────────────────────────────────────────────────
  try {
    const quoteWithSeller = {
      customerId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      customerName: 'Cliente C',
      subtotalCents: 50000,
      totalCents: 50000,
      discount: { type: 'none', value: 0, appliedAmountCents: 0 },
      discountCents: 0,
      financialTerms: { paymentMethod: 'pix', paymentCondition: 'in_cash', installmentsCount: 1, downPaymentCents: 0, installments: [] },
      sellerId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      sellerName: 'Pedro Vendedor',
      commissionRatePercent: 10,
      commissionAmountCents: 5000,
    };
    const payload = buildQuotePayload(quoteWithSeller);

    results.push({
      suiteName,
      testName: 'C1. seller_id preservado no payload',
      passed: payload.seller_id === 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      error: payload.seller_id !== 'c3d4e5f6-a7b8-9012-cdef-123456789012' ? `seller_id incorreto: ${payload.seller_id}` : undefined,
    });

    results.push({
      suiteName,
      testName: 'C2. seller_name preservado no payload',
      passed: payload.seller_name === 'Pedro Vendedor',
      error: payload.seller_name !== 'Pedro Vendedor' ? `seller_name incorreto: ${payload.seller_name}` : undefined,
    });
  } catch (err: unknown) {
    results.push({ suiteName, testName: 'C. Seller preservado', passed: false, error: String(err) });
  }

  // ──────────────────────────────────────────────────
  // CASO D: Subtotal, desconto e total inalterados
  // ──────────────────────────────────────────────────
  try {
    const quoteWithDiscount = {
      customerId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      customerName: 'Cliente D',
      subtotalCents: 30000,
      totalCents: 27000,
      discount: { type: 'percentage', value: 10, appliedAmountCents: 3000, reason: 'Fidelidade' },
      discountCents: 3000,
      financialTerms: { paymentMethod: 'credit_card', paymentCondition: 'installments', installmentsCount: 3, downPaymentCents: 0, installments: [] },
      sellerId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      sellerName: 'Ana Vendedora',
      commissionRatePercent: 8,
      commissionAmountCents: 2160,
    };
    const payload = buildQuotePayload(quoteWithDiscount);

    results.push({
      suiteName,
      testName: 'D1. subtotal_cents inalterado (30000)',
      passed: payload.subtotal_cents === 30000,
      error: payload.subtotal_cents !== 30000 ? `Esperado 30000, encontrado ${payload.subtotal_cents}` : undefined,
    });

    results.push({
      suiteName,
      testName: 'D2. discount_applied_cents inalterado (3000)',
      passed: payload.discount_applied_cents === 3000,
      error: payload.discount_applied_cents !== 3000 ? `Esperado 3000, encontrado ${payload.discount_applied_cents}` : undefined,
    });

    results.push({
      suiteName,
      testName: 'D3. total_cents inalterado (27000)',
      passed: payload.total_cents === 27000,
      error: payload.total_cents !== 27000 ? `Esperado 27000, encontrado ${payload.total_cents}` : undefined,
    });
  } catch (err: unknown) {
    results.push({ suiteName, testName: 'D. Valores comerciais inalterados', passed: false, error: String(err) });
  }

  // ──────────────────────────────────────────────────
  // CASO E: RPC SQL persiste commission nas colunas
  // ──────────────────────────────────────────────────
  try {
    // Verifica que a definição vigente da RPC (0011) inclui commission no INSERT
    const migrationPath = path.resolve(__dirname, '../../supabase/migrations/0011_fix_quote_items_version_in_atomic_rpcs.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Verifica colunas na lista do INSERT
    const hasCommissionRateColumn = sqlContent.includes('commission_rate_percent,');
    const hasCommissionAmountColumn = sqlContent.includes('commission_amount_cents,');

    // Verifica valores no INSERT (extração de p_quote)
    const hasCommissionRateValue = sqlContent.includes("(p_quote->>'commission_rate_percent')::pg_catalog.numeric");
    const hasCommissionAmountValue = sqlContent.includes("(p_quote->>'commission_amount_cents')::pg_catalog.int8");

    results.push({
      suiteName,
      testName: 'E1. RPC SQL inclui coluna commission_rate_percent no INSERT',
      passed: hasCommissionRateColumn,
      error: !hasCommissionRateColumn ? 'Coluna commission_rate_percent ausente no INSERT da RPC' : undefined,
    });

    results.push({
      suiteName,
      testName: 'E2. RPC SQL inclui coluna commission_amount_cents no INSERT',
      passed: hasCommissionAmountColumn,
      error: !hasCommissionAmountColumn ? 'Coluna commission_amount_cents ausente no INSERT da RPC' : undefined,
    });

    results.push({
      suiteName,
      testName: 'E3. RPC SQL extrai commission_rate_percent de p_quote',
      passed: hasCommissionRateValue,
      error: !hasCommissionRateValue ? 'Extração de commission_rate_percent de p_quote ausente na RPC' : undefined,
    });

    results.push({
      suiteName,
      testName: 'E4. RPC SQL extrai commission_amount_cents de p_quote',
      passed: hasCommissionAmountValue,
      error: !hasCommissionAmountValue ? 'Extração de commission_amount_cents de p_quote ausente na RPC' : undefined,
    });
  } catch (err: unknown) {
    results.push({ suiteName, testName: 'E. RPC SQL persiste comissão', passed: false, error: String(err) });
  }

  // ──────────────────────────────────────────────────
  // CASO F: Payload do repository.ts inclui commission
  // ──────────────────────────────────────────────────
  try {
    const repoPath = path.resolve(__dirname, '../repositories/quote.repository.ts');
    const repoContent = fs.readFileSync(repoPath, 'utf-8');

    const hasCommissionRateInPayload = repoContent.includes('commission_rate_percent: quote.commissionRatePercent');
    const hasCommissionAmountInPayload = repoContent.includes('commission_amount_cents: quote.commissionAmountCents');

    results.push({
      suiteName,
      testName: 'F1. quote.repository.ts inclui commission_rate_percent no quotePayload',
      passed: hasCommissionRateInPayload,
      error: !hasCommissionRateInPayload ? 'commission_rate_percent ausente no quotePayload do repository' : undefined,
    });

    results.push({
      suiteName,
      testName: 'F2. quote.repository.ts inclui commission_amount_cents no quotePayload',
      passed: hasCommissionAmountInPayload,
      error: !hasCommissionAmountInPayload ? 'commission_amount_cents ausente no quotePayload do repository' : undefined,
    });
  } catch (err: unknown) {
    results.push({ suiteName, testName: 'F. Repository inclui comissão', passed: false, error: String(err) });
  }

  return results;
}
