/**
 * @file customer.service.ts
 * @description Contrato de Serviço para Gestão de Clientes Multi-tenant
 * @project OrçaGraf - Etapa 1 Fundação
 */

import { Customer } from '../types/customer';
import { ApiResponse, PaginatedList, TenantScopedQuery } from './api-contract';

export interface ICustomerService {
  list(query: TenantScopedQuery): Promise<ApiResponse<PaginatedList<Customer>>>;
  getById(tenantId: string, customerId: string): Promise<ApiResponse<Customer>>;
  create(tenantId: string, data: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>>;
  update(tenantId: string, customerId: string, data: Partial<Customer>): Promise<ApiResponse<Customer>>;
}

/**
 * Implementação Base para Etapa 1 (Fundação de Sistema)
 * Retorna estado vazio honesto até a integração do banco de dados na etapa subsequente.
 */
export const customerService: ICustomerService = {
  async list(query: TenantScopedQuery): Promise<ApiResponse<PaginatedList<Customer>>> {
    if (!query.tenantId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED_TENANT', message: 'Identificador de empresa obrigatório.' },
      };
    }
    // Estado inicial de fundação: nenhum cliente cadastrado
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

  async getById(tenantId: string, customerId: string): Promise<ApiResponse<Customer>> {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: `Cliente ${customerId} não encontrado para tenant ${tenantId}.` },
    };
  },

  async create(tenantId: string, data: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    return {
      success: false,
      error: { code: 'STAGE_1_FOUNDATION', message: 'Criação de clientes será habilitada na etapa de cadastros.' },
    };
  },

  async update(tenantId: string, customerId: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return {
      success: false,
      error: { code: 'STAGE_1_FOUNDATION', message: 'Atualização de clientes será habilitada na etapa de cadastros.' },
    };
  },
};
