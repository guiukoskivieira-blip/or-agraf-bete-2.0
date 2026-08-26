/**
 * @file audit.ts
 * @description Contratos de Domínio para Eventos de Auditoria e Rastreabilidade
 * @project OrçaGraf - Etapa 1 Fundação
 */

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'status_change' 
  | 'quote_sent' 
  | 'quote_viewed' 
  | 'quote_converted' 
  | 'login' 
  | 'company_switch';

export interface AuditEvent {
  id: string;
  tenantId: string; // Isolamento multiempresa obrigatório
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: 'quote' | 'order' | 'customer' | 'product' | 'company' | 'auth';
  entityId: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: string; // ISO 8601
}
