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
  unitPriceCents: number;
  totalPriceCents: number;
  isRequired?: boolean;
  isOptional?: boolean;
  quantity?: number;
  notes?: string;
}

export interface QuoteItem {
  id: string;
  productId?: string; // Vinculado a um produto do catálogo ou item avulso
  productName: string;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  areaM2?: number;
  materialName?: string;
  finishings: QuoteItemFinishing[];
  unitCostCents: number;
  unitPriceCents: number;
  totalPriceCents: number;
  notes?: string;
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
  approvedAt?: string;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
