/**
 * @file arteflow-integration.service.ts
 * @description Serviço Isolado de Integração e Geração do Evento QUOTE_APPROVED para ArteFlow
 * @project OrçaGraf
 * 
 * NOTA DE ARQUITETURA:
 * O OrçaGraf prepara o payload estruturado QUOTE_APPROVED. O ArteFlow utilizará esse
 * evento futuramente para criar o pedido sem redigitação.
 * 
 * Não há comunicação fictícia de rede: os tipos, contratos e o gerador de eventos são
 * formalmente isolados, validados e testados.
 */

import { Quote } from '../types/quote';
import { QuoteApprovedEventPayload } from '../types/arteflow';

export class ArteFlowIntegrationService {
  /**
   * Constrói o evento estruturado QUOTE_APPROVED a partir de um orçamento aprovado
   */
  public static buildQuoteApprovedEvent(
    quote: Quote,
    commercialUser?: { id: string; name: string; email?: string }
  ): QuoteApprovedEventPayload {
    const now = new Date().toISOString();

    const sellerId = quote.sellerId || quote.salespersonId || null;
    const sellerName = quote.sellerName || quote.salespersonName || null;
    const commissionRatePercent = quote.commissionRatePercent ?? null;
    const commissionAmountCents = quote.commissionAmountCents ?? null;

    const payload: QuoteApprovedEventPayload = {
      eventName: 'QUOTE_APPROVED',
      eventId: `evt_qa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      tenantId: quote.tenantId,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      sellerId,
      sellerName,
      commissionRatePercent,
      commissionAmountCents,
      customer: {
        id: quote.customerId,
        name: quote.customerName,
        document: quote.customerDocument,
        contact: quote.customerContact,
        email: quote.customerEmail,
      },
      items: (quote.items || []).map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        materialName: item.materialName,
        finishings: (item.finishings || []).map(f => ({
          finishingId: f.finishingId,
          name: f.name,
          quantity: f.quantity,
          unitPriceCents: f.unitPriceCents || 0,
          totalPriceCents: f.totalPriceCents || 0,
          isRequired: f.isRequired,
          notes: f.notes,
        })),
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.totalPriceCents,
        notes: item.notes,
      })),
      notes: quote.paymentTerms,
      subtotalCents: quote.subtotalCents,
      discount: {
        type: quote.discount?.type || 'none',
        value: quote.discount?.value || 0,
        appliedAmountCents: quote.discount?.appliedAmountCents || 0,
        reason: quote.discount?.reason,
      },
      totalFinalCents: quote.totalCents,
      financialConditions: {
        paymentMethod: quote.financialTerms?.paymentMethod || 'to_be_defined',
        paymentCondition: quote.financialTerms?.paymentCondition || 'to_be_defined',
        downPaymentCents: quote.financialTerms?.downPaymentCents || 0,
        installmentsCount: quote.financialTerms?.installmentsCount || 1,
        installments: (quote.financialTerms?.installments || []).map(inst => ({
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          amountCents: inst.amountCents,
        })),
        financialNotes: quote.financialTerms?.financialNotes,
      },
      commercialResponsible: {
        id: commercialUser?.id || (sellerId || 'commercial_lead'),
        name: commercialUser?.name || (sellerName || 'Atendimento Comercial'),
        email: commercialUser?.email,
      },
      approvedAt: quote.approvedAt || now,
    };

    return payload;
  }

  /**
   * Valida se o payload gerado cumpre todos os requisitos do contrato QUOTE_APPROVED
   */
  public static validateQuoteApprovedPayload(payload: QuoteApprovedEventPayload): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (payload.eventName !== 'QUOTE_APPROVED') {
      errors.push('Nome do evento deve ser QUOTE_APPROVED.');
    }
    if (!payload.tenantId) {
      errors.push('tenantId é obrigatório no evento.');
    }
    if (!payload.quoteId || !payload.quoteNumber) {
      errors.push('quoteId e quoteNumber são obrigatórios.');
    }
    if (!payload.customer || !payload.customer.name) {
      errors.push('Dados do cliente são obrigatórios.');
    }
    if (!payload.items || payload.items.length === 0) {
      errors.push('A lista de itens do orçamento não pode ser vazia.');
    }
    if (payload.subtotalCents < 0 || payload.totalFinalCents < 0) {
      errors.push('Valores monetários não podem ser negativos.');
    }
    if (payload.totalFinalCents !== payload.subtotalCents - payload.discount.appliedAmountCents) {
      errors.push('O total final deve ser exatamente subtotal menos desconto aplicado.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
