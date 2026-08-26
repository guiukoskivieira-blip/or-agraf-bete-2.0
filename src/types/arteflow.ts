/**
 * @file arteflow.ts
 * @description Contratos de Integração de Eventos com ArteFlow (QUOTE_APPROVED)
 * @project OrçaGraf
 * 
 * NOTA DE ARQUITETURA:
 * O OrçaGraf não implementa funções de produção ou chão de fábrica.
 * Quando um orçamento for aprovado, o evento estruturado QUOTE_APPROVED é gerado
 * para permitir que o ArteFlow crie o pedido e a ordem de serviço sem redigitação.
 */

import { PaymentMethod, PaymentCondition, QuoteDiscountType } from './quote';

export interface ArteFlowSyncStatus {
  status: 'pending' | 'synced' | 'failed';
  arteflowOrderId?: string;
  syncedAt?: string;
  syncError?: string;
}

export interface QuoteApprovedEventPayload {
  eventName: 'QUOTE_APPROVED';
  eventId: string;
  timestamp: string; // ISO 8601
  tenantId: string;
  quoteId: string;
  quoteNumber: string;
  sellerId?: string | null; // ID do vendedor responsável (opcional)
  sellerName?: string | null; // Nome do vendedor responsável (opcional)
  commissionRatePercent?: number | null; // Taxa de comissão opcional
  commissionAmountCents?: number | null; // Valor de comissão opcional
  subtotalCents: number; // Valor bruto
  discount: {
    type: QuoteDiscountType;
    value: number;
    appliedAmountCents: number;
    reason?: string;
  }; // Desconto comercial
  totalFinalCents: number; // Valor final
  customer: {
    id: string;
    name: string;
    document?: string;
    contact?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    widthMm?: number;
    heightMm?: number;
    materialName?: string;
    finishings: Array<{
      finishingId?: string;
      name: string;
      quantity?: number;
      unitPriceCents: number;
      totalPriceCents: number;
      isRequired?: boolean;
      notes?: string;
    }>;
    unitPriceCents: number;
    totalPriceCents: number;
    notes?: string;
  }>;
  notes?: string;
  financialConditions: {
    paymentMethod: PaymentMethod;
    paymentCondition: PaymentCondition;
    downPaymentCents: number;
    installmentsCount: number;
    installments: Array<{
      installmentNumber: number;
      dueDate: string;
      amountCents: number;
    }>;
    financialNotes?: string;
  };
  commercialResponsible: {
    id: string;
    name: string;
    email?: string;
  };
  approvedAt: string;
}
