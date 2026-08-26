/**
 * @file customer.service.ts
 * @description Contrato de Serviço para Gestão de Clientes Multi-tenant do OrçaGraf
 * @project OrçaGraf
 */

import { Customer } from '../types/customer';
import { ApiResponse, PaginatedList, TenantScopedQuery } from './api-contract';
import { customerRepository, CustomerCreateInput, CustomerUpdateInput } from '../domain/customer-repository';

export interface CustomerFilterQuery extends TenantScopedQuery {
  searchTerm?: string;
  isActive?: boolean;
}

export interface ICustomerService {
  list(query: CustomerFilterQuery): Promise<ApiResponse<PaginatedList<Customer>>>;
  getById(tenantId: string, customerId: string): Promise<ApiResponse<Customer>>;
  create(tenantId: string, data: CustomerCreateInput): Promise<ApiResponse<Customer>>;
  update(tenantId: string, customerId: string, data: CustomerUpdateInput): Promise<ApiResponse<Customer>>;
  toggleActive(tenantId: string, customerId: string): Promise<ApiResponse<{ isActive: boolean }>>;
}

export const customerService: ICustomerService = {
  async list(query: CustomerFilterQuery): Promise<ApiResponse<PaginatedList<Customer>>> {
    if (!query.tenantId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED_TENANT', message: 'Identificador de empresa obrigatório.' },
      };
    }

    const items = await customerRepository.list(query.tenantId, {
      searchTerm: query.searchTerm,
      isActive: query.isActive,
      page: query.page,
      pageSize: query.pageSize,
    });

    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const total = items.length;

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  },

  async getById(tenantId: string, customerId: string): Promise<ApiResponse<Customer>> {
    if (!tenantId || !customerId) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'Identificadores obrigatórios.' },
      };
    }

    const customer = await customerRepository.getById(tenantId, customerId);
    if (!customer) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Cliente ${customerId} não encontrado para empresa ${tenantId}.` },
      };
    }

    return { success: true, data: customer };
  },

  async create(tenantId: string, data: CustomerCreateInput): Promise<ApiResponse<Customer>> {
    if (!tenantId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED_TENANT', message: 'Identificador de empresa obrigatório.' },
      };
    }

    const result = await customerRepository.create(tenantId, data);
    if (!result.success || !result.customer) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error || 'Erro ao cadastrar cliente.' },
      };
    }

    return { success: true, data: result.customer };
  },

  async update(tenantId: string, customerId: string, data: CustomerUpdateInput): Promise<ApiResponse<Customer>> {
    if (!tenantId || !customerId) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'Identificadores obrigatórios.' },
      };
    }

    const result = await customerRepository.update(tenantId, customerId, data);
    if (!result.success || !result.customer) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error || 'Erro ao atualizar cliente.' },
      };
    }

    return { success: true, data: result.customer };
  },

  async toggleActive(tenantId: string, customerId: string): Promise<ApiResponse<{ isActive: boolean }>> {
    if (!tenantId || !customerId) {
      return {
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'Identificadores obrigatórios.' },
      };
    }

    const result = await customerRepository.toggleActive(tenantId, customerId);
    if (!result.success || result.isActive === undefined) {
      return {
        success: false,
        error: { code: 'OPERATION_ERROR', message: result.error || 'Erro ao alterar status do cliente.' },
      };
    }

    return { success: true, data: { isActive: result.isActive } };
  },
};
