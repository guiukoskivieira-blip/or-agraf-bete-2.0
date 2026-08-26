/**
 * @file order.service.ts
 * @description Contrato de Serviço para Pedidos Comerciais Multi-tenant
 * @project OrçaGraf - Etapa 1 Fundação
 */

import { Order, OrderStatus } from '../types/order';
import { ApiResponse, PaginatedList, TenantScopedQuery } from './api-contract';

export interface OrderFilterQuery extends TenantScopedQuery {
  status?: OrderStatus;
  customerId?: string;
}

export interface IOrderService {
  list(query: OrderFilterQuery): Promise<ApiResponse<PaginatedList<Order>>>;
  getById(tenantId: string, orderId: string): Promise<ApiResponse<Order>>;
}

export const orderService: IOrderService = {
  async list(query: OrderFilterQuery): Promise<ApiResponse<PaginatedList<Order>>> {
    if (!query.tenantId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED_TENANT', message: 'Identificador de empresa obrigatório.' },
      };
    }
    return {
      success: true,
      data: {
        items: [],
        total: 0,
        page: query.page || 1,
        pageSize: query.pageSize || 10,
        totalPages: 0,
      },
    };
  },

  async getById(tenantId: string, orderId: string): Promise<ApiResponse<Order>> {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: `Pedido ${orderId} não encontrado para empresa ${tenantId}.` },
    };
  },
};
