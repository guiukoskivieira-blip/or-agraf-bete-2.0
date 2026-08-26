import { PrexyonRuntimeConfig } from '../config/prexyon';
import {
  PrexyonEventEnvelope,
  PrexyonEventName,
  PrexyonProductId,
  PrexyonSessionContract,
} from '../types/prexyon';

export class PrexyonPlatformService {
  static hasProductAccess(
    session: PrexyonSessionContract | null,
    productId: PrexyonProductId
  ): boolean {
    if (!session) return false;
    return session.entitlements.some(
      entitlement =>
        entitlement.productId === productId &&
        (entitlement.status === 'active' || entitlement.status === 'trial')
    );
  }

  static getProductUrl(
    config: PrexyonRuntimeConfig,
    productId: PrexyonProductId,
    session: PrexyonSessionContract | null
  ): string | null {
    if (productId === 'orcagraf') return null;
    if (config.mode !== 'platform') return null;
    if (!this.hasProductAccess(session, productId)) return null;
    return config.productUrls[productId] || null;
  }

  static buildEventEnvelope<TPayload>(input: {
    eventName: PrexyonEventName;
    destinationProduct: PrexyonProductId;
    organizationId: string;
    tenantId: string;
    correlationId: string;
    idempotencyKey: string;
    payload: TPayload;
    eventId?: string;
    occurredAt?: string;
  }): PrexyonEventEnvelope<TPayload> {
    if (!input.organizationId || !input.tenantId) {
      throw new Error('organizationId e tenantId são obrigatórios para eventos Prexyon.');
    }
    if (!input.correlationId || !input.idempotencyKey) {
      throw new Error('correlationId e idempotencyKey são obrigatórios para integração segura.');
    }

    return {
      schemaVersion: 1,
      eventId: input.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      eventName: input.eventName,
      sourceProduct: 'orcagraf',
      destinationProduct: input.destinationProduct,
      organizationId: input.organizationId,
      tenantId: input.tenantId,
      occurredAt: input.occurredAt || new Date().toISOString(),
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
    };
  }
}
