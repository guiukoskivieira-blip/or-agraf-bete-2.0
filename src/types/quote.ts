/**
 * @file quote.ts
 * @description Contratos de Domínio para Orçamentos Gráficos, Descontos e Condições Financeiras
 * @project OrçaGraf
 * 
 * STATUS OFICIAIS PERMITIDOS PARA ORÇAMENTOS:
 * - 'awaiting_customer' ("Aguardando cliente")
 * - 'approved'          ("Aprovado")
 * - 'rejected'          ("Recusado")
 * 
 * NOTA DE DOMÍNIO:
 * O orçamento não expira automaticamente e não possui status "Expirado".
 * O campo "Cores" foi removido dos itens do orçamento.
 */

import { ArteFlowSyncStatus } from './arteflow';
import { PricingMode, FinishingPricingBasis, FinishingPriceStatus } from './product';

export type QuoteStatus = 
  | 'awaiting_customer' // Aguardando cliente
  | 'approved'          // Aprovado
  | 'rejected';         // Recusado

export type QuoteDiscountType = 'none' | 'percentage' | 'fixed';

export interface QuoteDiscount {
  type: QuoteDiscountType;
  value: number; // Porcentagem (ex: 10 para 10%) ou valor fixo em centavos (ex: 2500 para R$ 25,00)
  appliedAmountCents: number; // Valor do desconto em centavos inteiros
  reason?: string; // Motivo opcional
  userId?: string; // Usuário responsável pelo desconto
  userName?: string;
  appliedAt?: string; // Data e hora de aplicação (ISO 8601)
}

export type PaymentMethod = 
  | 'pix' 
  | 'cash' 
  | 'debit_card' 
  | 'credit_card' 
  | 'bank_slip' 
  | 'bank_transfer' 
  | 'to_be_defined';

export type PaymentCondition = 
  | 'in_cash' 
  | 'down_payment_and_balance' 
  | 'installments' 
  | 'to_be_defined';

export interface QuoteInstallmentPlan {
  installmentNumber: number;
  dueDate: string; // Formato YYYY-MM-DD
  amountCents: number; // Centavos inteiros
}

export interface QuoteFinancialTerms {
  paymentMethod: PaymentMethod;
  paymentCondition: PaymentCondition;
  installmentsCount: number; // 1 para à vista, >= 1 para parcelado
  downPaymentCents: number; // Valor de entrada quando houver
  expectedDownPaymentDate?: string; // Data prevista da entrada
  installmentIntervalDays: number; // Intervalo entre parcelas em dias (padrão 30)
  financialNotes?: string; // Observações financeiras
  responsibleUserId?: string; // Responsável pelo orçamento
  responsibleUserName?: string;
  installments: QuoteInstallmentPlan[]; // Lista de parcelas calculadas
}

export interface QuoteItemFinishing {
  finishingId: string;
  name: string;
  pricingBasis?: FinishingPricingBasis;
  unitPriceCents: number;
  billedQuantity?: number;
  totalPriceCents: number;
  priceStatus?: FinishingPriceStatus;
  calculationMemory?: string;
  isRequired?: boolean;
  isOptional?: boolean;
  quantity?: number;
  notes?: string;
}

export interface QuoteItem {
  id: string;
  productId?: string; // Vinculado a um produto do catálogo ou item avulso
  productName: string;
  pricingMode?: PricingMode; // Modalidade determinística ('UNIT' | 'LOT' | 'SQUARE_METER' | 'LINEAR_METER')
  quantity: number; // Quantidade solicitada (unidades ou peças)
  lotSize?: number; // Tamanho do lote quando LOT (ex: 1000)
  billedQuantity?: number; // Quantidade cobrada (ex: 1 lote, 2 lotes, 3 peças, 1.5 m², 6.0 m linear)
  widthMm?: number;
  heightMm?: number;
  areaM2?: number; // Área em m²
  linearMeters?: number; // Comprimento em metros lineares
  basePriceCents?: number; // Preço base configurado (por unidade, por lote, por m² ou por metro linear)
  materialName?: string;
  finishings: QuoteItemFinishing[];
  unitCostCents: number;
  unitPriceCents: number; // Preço unitário/calculado (mantido para compatibilidade e cálculos)
  totalPriceCents: number; // Total final exato do item com acabamentos em centavos inteiros
  notes?: string;
  pricingSummary?: string; // Resumo textual legível (ex: "1.000 unidades • 1 lote de 1.000 × R$ 70,00 = R$ 70,00")
}

export interface QuoteVersion {
  versionNumber: number;
  createdAt: string;
  createdByUserId: string;
  changeReason?: string;
  items: QuoteItem[];
  subtotalCents: number;
  discount: QuoteDiscount;
  shippingCents: number;
  totalCents: number;
  financialTerms: QuoteFinancialTerms;
}

export interface QuoteEvent {
  id: string;
  quoteId: string;
  tenantId: string;
  type: 
    | 'created' 
    | 'updated' 
    | 'discount_applied'
    | 'sent_whatsapp' 
    | 'sent_email' 
    | 'viewed_by_customer'
    | 'approved' 
    | 'rejected';
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  userId?: string;
  userName?: string;
}

export interface Quote {
  id: string;
  tenantId: string; // Isolamento multiempresa obrigatório
  quoteNumber: string; // ex: "ORC-2026-0001"
  customerId: string;
  customerName: string; // Desnormalizado para buscas ágeis no balcão
  customerContact?: string;
  customerDocument?: string;
  customerEmail?: string;
  currentVersion: number;
  status: QuoteStatus;
  
  // Totais da versão atual (em centavos inteiros)
  items: QuoteItem[];
  subtotalCents: number; // Subtotal original preservado
  discount: QuoteDiscount; // Desconto global estruturado
  discountCents: number; // Atalho numérico para discount.appliedAmountCents
  shippingCents: number;
  totalCents: number; // TOTAL FINAL = SUBTOTAL - DESCONTO

  estimatedProductionDays?: number;
  paymentTerms?: string; // Texto descritivo resumido
  financialTerms: QuoteFinancialTerms; // Condições financeiras estruturadas

  salespersonId?: string | null;
  salespersonName?: string | null;
  sellerId?: string | null; // Alias explícito do vendedor responsável
  sellerName?: string | null;
  commissionRatePercent?: number | null;
  commissionAmountCents?: number | null;

  // Histórico de versões e eventos
  versions: QuoteVersion[];
  events?: QuoteEvent[];
  
  // Sincronização com ArteFlow
  arteflowSync?: ArteFlowSyncStatus;

  // Auditoria e metadados
  dataOrigin?: 'demo' | 'user';
  approvedAt?: string;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
