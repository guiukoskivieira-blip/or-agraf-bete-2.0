/**
 * @file quote.repository.ts
 * @description Repositório Comercial de Orçamentos com Criação Atômica e RLS via Supabase
 * @project OrçaGraf
 */

import { getSupabaseClient, isSupabaseConfigured, isModeConnected } from '../services/supabase-client';
import { Quote, QuoteItem, QuoteEvent, QuoteVersion, QuoteDiscount } from '../types/quote';

// In-Memory Storage para modo standalone e testes
const inMemoryQuotes: Map<string, Quote[]> = new Map();

function mapRowToQuote(row: any): Quote {
  const items: QuoteItem[] = (row.quote_items || []).map((itemRow: any) => ({
    id: itemRow.id,
    productId: itemRow.product_id || undefined,
    productName: itemRow.product_name,
    pricingMode: itemRow.pricing_mode || 'UNIT',
    quantity: Number(itemRow.quantity || 1),
    lotSize: itemRow.lot_size ? Number(itemRow.lot_size) : undefined,
    billedQuantity: itemRow.billed_quantity ? Number(itemRow.billed_quantity) : Number(itemRow.quantity || 1),
    widthMm: itemRow.width_mm ? Number(itemRow.width_mm) : undefined,
    heightMm: itemRow.height_mm ? Number(itemRow.height_mm) : undefined,
    areaM2: itemRow.area_m2 ? Number(itemRow.area_m2) : undefined,
    linearMeters: itemRow.linear_meters ? Number(itemRow.linear_meters) : undefined,
    basePriceCents: Number(itemRow.base_price_cents || 0),
    unitCostCents: Number(itemRow.unit_cost_cents || 0),
    unitPriceCents: Number(itemRow.unit_price_cents || 0),
    totalPriceCents: Number(itemRow.total_price_cents || 0),
    materialName: itemRow.material_name || undefined,
    notes: itemRow.notes || undefined,
    finishings: (itemRow.quote_item_finishings || []).map((finRow: any) => ({
      finishingId: finRow.finishing_id || finRow.id,
      name: finRow.name,
      pricingBasis: finRow.pricing_basis || 'FIXED',
      unitPriceCents: Number(finRow.unit_price_cents || 0),
      billedQuantity: Number(finRow.billed_quantity || 1),
      totalPriceCents: Number(finRow.total_price_cents || 0),
      priceStatus: finRow.price_status || 'CONFIGURED',
      calculationMemory: finRow.calculation_memory || undefined,
      isRequired: Boolean(finRow.is_required),
      isOptional: Boolean(finRow.is_optional),
      notes: finRow.notes || undefined,
    })),
  }));

  const events: QuoteEvent[] = (row.quote_events || []).map((evRow: any) => ({
    id: evRow.id,
    quoteId: evRow.quote_id,
    tenantId: evRow.organization_id,
    type: evRow.event_type.toLowerCase() as any,
    description: evRow.description,
    metadata: evRow.metadata_json || {},
    createdAt: evRow.created_at,
    userId: evRow.user_id || undefined,
    userName: evRow.user_name || undefined,
  }));

  const discount: QuoteDiscount = {
    type: row.discount_type || 'none',
    value: Number(row.discount_value || 0),
    appliedAmountCents: Number(row.discount_applied_cents || 0),
    reason: row.discount_reason || undefined,
  };

  return {
    id: row.id,
    tenantId: row.organization_id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id || '',
    customerName: row.customer_name || 'Consumidor Final',
    customerContact: row.customer_contact || undefined,
    customerDocument: row.customer_document || undefined,
    customerEmail: row.customer_email || undefined,
    currentVersion: row.current_version || 1,
    status: row.status || 'awaiting_customer',
    items,
    subtotalCents: Number(row.subtotal_cents || 0),
    discount,
    discountCents: Number(row.discount_applied_cents || 0),
    shippingCents: 0,
    totalCents: Number(row.total_cents || 0),
    estimatedProductionDays: row.production_days || 3,
    paymentTerms: row.payment_condition || undefined,
    financialTerms: {
      paymentMethod: row.payment_method || 'to_be_defined',
      paymentCondition: row.payment_condition || 'to_be_defined',
      installmentsCount: row.installments_count || 1,
      downPaymentCents: Number(row.down_payment_cents || 0),
      installmentIntervalDays: 30,
      installments: row.installments_json || [],
    },
    sellerId: row.seller_id || undefined,
    sellerName: row.seller_name || undefined,
    salespersonId: row.seller_id || undefined,
    salespersonName: row.seller_name || undefined,
    commissionRatePercent: row.commission_rate_percent ? Number(row.commission_rate_percent) : undefined,
    commissionAmountCents: row.commission_amount_cents ? Number(row.commission_amount_cents) : undefined,
    versions: [],
    events,
    dataOrigin: 'user',
    approvedAt: row.approved_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class QuoteRepository {
  async listQuotes(tenantId: string): Promise<Quote[]> {
    if (!tenantId) return [];

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client indisponível.');

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (
            *,
            quote_item_finishings (*)
          ),
          quote_events (*)
        `)
        .eq('organization_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[QuoteRepository.listQuotes] Erro:', error);
        throw new Error(error.message);
      }

      return (data || []).map(mapRowToQuote);
    }

    // Modo Standalone
    let list = inMemoryQuotes.get(tenantId);
    if (!list) {
      list = [];
      inMemoryQuotes.set(tenantId, list);
    }
    return list;
  }

  async getQuoteById(tenantId: string, id: string): Promise<Quote | null> {
    if (!tenantId || !id) return null;

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase indisponível.');

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (
            *,
            quote_item_finishings (*)
          ),
          quote_events (*)
        `)
        .eq('organization_id', tenantId)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapRowToQuote(data) : null;
    }

    const list = await this.listQuotes(tenantId);
    return list.find(q => q.id === id) || null;
  }

  async createQuote(
    tenantId: string,
    quote: Partial<Quote>,
    items: QuoteItem[]
  ): Promise<{ success: boolean; quote?: Quote; error?: string }> {
    if (!tenantId) return { success: false, error: 'Tenant inválido.' };
    if (!items || items.length === 0) return { success: false, error: 'O orçamento precisa de ao menos um item.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      // Monta payload do cabeçalho
      const quotePayload = {
        customer_id: quote.customerId || null,
        customer_name: quote.customerName || 'Consumidor Final',
        customer_document: quote.customerDocument || null,
        customer_contact: quote.customerContact || null,
        customer_email: quote.customerEmail || null,
        subtotal_cents: quote.subtotalCents || 0,
        discount_type: quote.discount?.type || 'none',
        discount_value: quote.discount?.value || 0,
        discount_applied_cents: quote.discountCents || 0,
        discount_reason: quote.discount?.reason || null,
        total_cents: quote.totalCents || 0,
        down_payment_cents: quote.financialTerms?.downPaymentCents || 0,
        payment_method: quote.financialTerms?.paymentMethod || 'to_be_defined',
        payment_condition: quote.financialTerms?.paymentCondition || 'to_be_defined',
        installments_count: quote.financialTerms?.installmentsCount || 1,
        installments_json: quote.financialTerms?.installments || [],
        production_days: quote.estimatedProductionDays || 3,
        internal_notes: quote.paymentTerms || null,
        customer_notes: null,
        seller_id: quote.sellerId || quote.salespersonId || null,
        seller_name: quote.sellerName || quote.salespersonName || null,
      };

      // Monta payload dos itens e acabamentos
      const itemsPayload = items.map(item => ({
        product_id: item.productId || null,
        product_name: item.productName,
        pricing_mode: item.pricingMode || 'UNIT',
        quantity: item.quantity,
        lot_size: item.lotSize || null,
        billed_quantity: item.billedQuantity || item.quantity,
        width_mm: item.widthMm || null,
        height_mm: item.heightMm || null,
        area_m2: item.areaM2 || null,
        linear_meters: item.linearMeters || null,
        base_price_cents: item.basePriceCents || 0,
        unit_cost_cents: item.unitCostCents || 0,
        unit_price_cents: item.unitPriceCents || 0,
        total_price_cents: item.totalPriceCents,
        material_name: item.materialName || null,
        notes: item.notes || null,
        finishings: (item.finishings || []).map(f => ({
          finishing_id: f.finishingId || null,
          name: f.name,
          pricing_basis: f.pricingBasis || 'FIXED',
          price_status: f.priceStatus || 'CONFIGURED',
          unit_price_cents: f.unitPriceCents || 0,
          billed_quantity: f.billedQuantity || 1,
          total_price_cents: f.totalPriceCents || 0,
          calculation_memory: f.calculationMemory || null,
          is_required: Boolean(f.isRequired),
          is_optional: Boolean(f.isOptional),
          notes: f.notes || null,
        })),
      }));

      // Chamada RPC Atômica
      const { data, error } = await supabase.rpc('create_quote_atomic', {
        p_organization_id: tenantId,
        p_quote: quotePayload,
        p_items: itemsPayload,
      });

      if (error) {
        console.error('[QuoteRepository.createQuote] Erro na RPC atômica:', error);
        return { success: false, error: error.message };
      }

      // Recupera o orçamento recém-criado com todos os relacionamentos
      const created = await this.getQuoteById(tenantId, data.id);
      return { success: true, quote: created || undefined };
    }

    // Modo Standalone
    const list = await this.listQuotes(tenantId);
    const newQuoteNumber = `ORC-${new Date().getFullYear()}-${String(list.length + 1).padStart(4, '0')}`;
    const newQuote: Quote = {
      id: `quot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      quoteNumber: newQuoteNumber,
      customerId: quote.customerId || '',
      customerName: quote.customerName || 'Consumidor Final',
      customerContact: quote.customerContact,
      customerDocument: quote.customerDocument,
      customerEmail: quote.customerEmail,
      currentVersion: 1,
      status: 'awaiting_customer',
      items,
      subtotalCents: quote.subtotalCents || 0,
      discount: quote.discount || { type: 'none', value: 0, appliedAmountCents: 0 },
      discountCents: quote.discountCents || 0,
      shippingCents: 0,
      totalCents: quote.totalCents || 0,
      estimatedProductionDays: quote.estimatedProductionDays || 3,
      paymentTerms: quote.paymentTerms,
      financialTerms: quote.financialTerms || {
        paymentMethod: 'to_be_defined',
        paymentCondition: 'to_be_defined',
        installmentsCount: 1,
        downPaymentCents: 0,
        installmentIntervalDays: 30,
        installments: [],
      },
      sellerId: quote.sellerId || quote.salespersonId,
      sellerName: quote.sellerName || quote.salespersonName,
      salespersonId: quote.salespersonId || quote.sellerId,
      salespersonName: quote.salespersonName || quote.sellerName,
      versions: [],
      events: [
        {
          id: `ev_${Date.now()}`,
          quoteId: '',
          tenantId,
          type: 'created',
          description: 'Orçamento criado em modo local',
          createdAt: new Date().toISOString(),
        },
      ],
      dataOrigin: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    newQuote.events![0].quoteId = newQuote.id;

    list.unshift(newQuote);
    inMemoryQuotes.set(tenantId, list);
    return { success: true, quote: newQuote };
  }

  async updateQuote(
    tenantId: string,
    id: string,
    expectedVersion: number,
    quote: Partial<Quote>,
    items: QuoteItem[]
  ): Promise<{ success: boolean; quote?: Quote; error?: string }> {
    if (!tenantId || !id) return { success: false, error: 'Parâmetros inválidos.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const quotePayload = {
        customer_id: quote.customerId || null,
        customer_name: quote.customerName,
        customer_document: quote.customerDocument || null,
        customer_contact: quote.customerContact || null,
        customer_email: quote.customerEmail || null,
        discount_type: quote.discount?.type || 'none',
        discount_value: quote.discount?.value || 0,
        discount_reason: quote.discount?.reason || null,
        down_payment_cents: quote.financialTerms?.downPaymentCents || 0,
        payment_method: quote.financialTerms?.paymentMethod,
        payment_condition: quote.financialTerms?.paymentCondition,
        installments_count: quote.financialTerms?.installmentsCount,
        installments_json: quote.financialTerms?.installments,
        production_days: quote.estimatedProductionDays,
        internal_notes: quote.paymentTerms,
        seller_id: quote.sellerId || quote.salespersonId,
        seller_name: quote.sellerName || quote.salespersonName,
      };

      const itemsPayload = items.map(item => ({
        product_id: item.productId || null,
        product_name: item.productName,
        pricing_mode: item.pricingMode || 'UNIT',
        quantity: item.quantity,
        lot_size: item.lotSize || null,
        billed_quantity: item.billedQuantity || item.quantity,
        width_mm: item.widthMm || null,
        height_mm: item.heightMm || null,
        area_m2: item.areaM2 || null,
        linear_meters: item.linearMeters || null,
        base_price_cents: item.basePriceCents || 0,
        unit_cost_cents: item.unitCostCents || 0,
        unit_price_cents: item.unitPriceCents || 0,
        total_price_cents: item.totalPriceCents,
        material_name: item.materialName || null,
        notes: item.notes || null,
        finishings: (item.finishings || []).map(f => ({
          finishing_id: f.finishingId || null,
          name: f.name,
          pricing_basis: f.pricingBasis || 'FIXED',
          price_status: f.priceStatus || 'CONFIGURED',
          unit_price_cents: f.unitPriceCents || 0,
          billed_quantity: f.billedQuantity || 1,
          total_price_cents: f.totalPriceCents || 0,
          calculation_memory: f.calculationMemory || null,
          is_required: Boolean(f.isRequired),
          is_optional: Boolean(f.isOptional),
          notes: f.notes || null,
        })),
      }));

      const { data, error } = await supabase.rpc('update_quote_atomic', {
        p_organization_id: tenantId,
        p_quote_id: id,
        p_expected_version: expectedVersion,
        p_quote: quotePayload,
        p_items: itemsPayload,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const updated = await this.getQuoteById(tenantId, id);
      return { success: true, quote: updated || undefined };
    }

    // Modo Standalone
    const list = await this.listQuotes(tenantId);
    const idx = list.findIndex(q => q.id === id);
    if (idx === -1) return { success: false, error: 'Orçamento não encontrado.' };

    const current = list[idx];
    if (current.currentVersion !== expectedVersion) {
      return { success: false, error: 'Conflito de concorrência: versão desatualizada.' };
    }

    const updated: Quote = {
      ...current,
      ...quote,
      items,
      currentVersion: current.currentVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    return { success: true, quote: updated };
  }

  async approveQuote(
    tenantId: string,
    id: string,
    notes?: string
  ): Promise<{ success: boolean; quote?: Quote; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { data, error } = await supabase.rpc('approve_quote', {
        p_organization_id: tenantId,
        p_quote_id: id,
        p_notes: notes || 'Aprovado via interface comercial',
      });

      if (error) return { success: false, error: error.message };

      const updated = await this.getQuoteById(tenantId, id);
      return { success: true, quote: updated || undefined };
    }

    const list = await this.listQuotes(tenantId);
    const idx = list.findIndex(q => q.id === id);
    if (idx === -1) return { success: false, error: 'Orçamento não encontrado.' };

    list[idx].status = 'approved';
    list[idx].approvedAt = new Date().toISOString();
    return { success: true, quote: list[idx] };
  }

  async rejectQuote(
    tenantId: string,
    id: string,
    reason?: string
  ): Promise<{ success: boolean; quote?: Quote; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { data, error } = await supabase.rpc('reject_quote', {
        p_organization_id: tenantId,
        p_quote_id: id,
        p_reason: reason || 'Recusado pelo cliente',
      });

      if (error) return { success: false, error: error.message };

      const updated = await this.getQuoteById(tenantId, id);
      return { success: true, quote: updated || undefined };
    }

    const list = await this.listQuotes(tenantId);
    const idx = list.findIndex(q => q.id === id);
    if (idx === -1) return { success: false, error: 'Orçamento não encontrado.' };

    list[idx].status = 'rejected';
    return { success: true, quote: list[idx] };
  }

  async deleteQuote(tenantId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { error } = await supabase
        .from('quotes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', tenantId)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const list = await this.listQuotes(tenantId);
    inMemoryQuotes.set(tenantId, list.filter(q => q.id !== id));
    return { success: true };
  }

  _clearForTest(tenantId?: string) {
    if (tenantId) inMemoryQuotes.delete(tenantId);
    else inMemoryQuotes.clear();
  }
}

export const quoteRepository = new QuoteRepository();
