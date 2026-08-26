/**
 * Contratos compartilháveis do ecossistema Prexyon.
 *
 * O OrçaGraf continua operando sozinho. Estes tipos definem a fronteira futura
 * com o portal central sem criar autenticação, assinatura ou integrações falsas.
 */

export type PrexyonProductId = 'orcagraf' | 'artecheck' | 'arteflow';

export type PrexyonRuntimeMode = 'standalone' | 'platform';

export type ProductEntitlementStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'suspended'
  | 'unavailable';

export interface ProductEntitlement {
  productId: PrexyonProductId;
  status: ProductEntitlementStatus;
  planCode?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface PrexyonIdentity {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface PrexyonOrganizationMembership {
  organizationId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
}

export interface PrexyonSessionContract {
  identity: PrexyonIdentity;
  membership: PrexyonOrganizationMembership;
  entitlements: ProductEntitlement[];
  issuedAt: string;
  expiresAt: string;
}

export type PrexyonEventName =
  | 'QUOTE_APPROVED'
  | 'PRINT_FILE_ATTACHED'
  | 'PRINT_FILE_VALIDATED'
  | 'PRODUCTION_ORDER_CREATED';

export interface PrexyonEventEnvelope<TPayload = unknown> {
  schemaVersion: 1;
  eventId: string;
  eventName: PrexyonEventName;
  sourceProduct: PrexyonProductId;
  destinationProduct: PrexyonProductId;
  organizationId: string;
  tenantId: string;
  occurredAt: string;
  correlationId: string;
  idempotencyKey: string;
  payload: TPayload;
}
