/**
 * @file product.service.ts
 * @description Contrato de Serviço para Produtos Gráficos e Tabelas de Insumos Multi-tenant
 * @project OrçaGraf - Etapa 1 Fundação
 */

import { Product, Material, Finishing } from '../types/product';
import { ApiResponse, PaginatedList, TenantScopedQuery } from './api-contract';

export interface IProductService {
  list(query: TenantScopedQuery): Promise<ApiResponse<PaginatedList<Product>>>;
  listMaterials(tenantId: string): Promise<ApiResponse<Material[]>>;
  listFinishings(tenantId: string): Promise<ApiResponse<Finishing[]>>;
}

export const productService: IProductService = {
  async list(query: TenantScopedQuery): Promise<ApiResponse<PaginatedList<Product>>> {
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

  async listMaterials(tenantId: string): Promise<ApiResponse<Material[]>> {
    return { success: true, data: [] };
  },

  async listFinishings(tenantId: string): Promise<ApiResponse<Finishing[]>> {
    return { success: true, data: [] };
  },
};
