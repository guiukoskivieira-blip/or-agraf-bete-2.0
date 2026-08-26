/**
 * @file quote-status.ts
 * @description Lógica de domínio e metadados dos status oficiais do Orçamento
 * @project OrçaGraf
 * 
 * STATUS OFICIAIS PERMITIDOS:
 * - 'awaiting_customer' ("Aguardando cliente")
 * - 'approved'          ("Aprovado")
 * - 'rejected'          ("Recusado")
 */

import { Quote, QuoteStatus } from '../types/quote';

export interface QuoteStatusMeta {
  label: string;
  badgeClass: string;
  description: string;
}

export const ALLOWED_QUOTE_STATUSES: QuoteStatus[] = [
  'awaiting_customer',
  'approved',
  'rejected',
];

export const QUOTE_STATUS_METADATA: Record<QuoteStatus, QuoteStatusMeta> = {
  awaiting_customer: {
    label: 'Aguardando cliente',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    description: 'Proposta comercial enviada e aguardando retorno ou aprovação do cliente.',
  },
  approved: {
    label: 'Aprovado',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    description: 'Orçamento formalmente aprovado pelo cliente.',
  },
  rejected: {
    label: 'Recusado',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    description: 'Proposta recusada ou cancelada pelo cliente.',
  },
};

/**
 * Valida se um status pertence aos 3 status permitidos
 */
export function isValidQuoteStatus(status: string): status is QuoteStatus {
  return ALLOWED_QUOTE_STATUSES.includes(status as QuoteStatus);
}

/**
 * Função de migração segura para dados legados (sem apagar orçamentos)
 */
export function normalizeQuoteStatus(legacyStatus: string): QuoteStatus {
  switch (legacyStatus) {
    case 'draft':
    case 'sent':
    case 'expired':
    case 'negotiating':
    case 'awaiting_customer':
      return 'awaiting_customer';
    case 'approved':
    case 'converted':
    case 'converted_to_order':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default:
      return 'awaiting_customer';
  }
}

/**
 * Identifica se um orçamento está ativo / aguardando retorno
 */
export function isOpenQuote(quote: Pick<Quote, 'status'>): boolean {
  return quote.status === 'awaiting_customer';
}

/**
 * Identifica se um orçamento precisa de acompanhamento ativo (follow-up)
 */
export function needsFollowUp(quote: Pick<Quote, 'status' | 'createdAt'>): boolean {
  if (quote.status !== 'awaiting_customer') {
    return false;
  }
  const createdDate = new Date(quote.createdAt).getTime();
  const twoDaysMs = 48 * 60 * 60 * 1000;
  return Date.now() - createdDate > twoDaysMs;
}
