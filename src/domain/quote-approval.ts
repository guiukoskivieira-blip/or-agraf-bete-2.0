import { Quote } from '../types/quote';
import { hasUserPermission, User } from '../types/tenant';

export type QuoteApprovalBlockReason =
  | 'TENANT_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'ALREADY_APPROVED'
  | 'INVALID_STATUS';

export type QuoteApprovalDecision =
  | { allowed: true }
  | { allowed: false; reason: QuoteApprovalBlockReason; message: string; idempotent?: boolean };

/**
 * Regra de negócio única para aprovação comercial.
 * A interface pode ocultar ações, mas nunca substitui esta autorização.
 */
export function evaluateQuoteApproval(
  quote: Quote,
  tenantId: string,
  user: User
): QuoteApprovalDecision {
  if (!tenantId || quote.tenantId !== tenantId || user.tenantId !== tenantId) {
    return {
      allowed: false,
      reason: 'TENANT_MISMATCH',
      message: 'Orçamento não encontrado para esta empresa.',
    };
  }

  if (!hasUserPermission(user, 'quotes', 'approve')) {
    return {
      allowed: false,
      reason: 'PERMISSION_DENIED',
      message: 'Você não possui permissão para aprovar orçamentos.',
    };
  }

  if (quote.status === 'approved') {
    return {
      allowed: false,
      reason: 'ALREADY_APPROVED',
      message: 'Este orçamento já consta como aprovado.',
      idempotent: true,
    };
  }

  if (quote.status !== 'awaiting_customer') {
    return {
      allowed: false,
      reason: 'INVALID_STATUS',
      message: 'Somente orçamentos aguardando o cliente podem ser aprovados.',
    };
  }

  return { allowed: true };
}
