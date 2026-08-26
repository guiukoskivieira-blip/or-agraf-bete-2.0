/**
 * @file api-contract.ts
 * @description Contratos de chamada, paginação e resultados para a arquitetura de serviços
 * @project OrçaGraf - Etapa 1 Fundação
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TenantScopedQuery {
  tenantId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
