/**
 * @file quote.service.ts
 * @description Contrato de Serviço para Gestão de Orçamentos Comerciais Multi-tenant
 * @project OrçaGraf - Etapa 1 Fundação
 */

import { Quote, QuoteStatus } from '../types/quote';
import { ApiResponse, PaginatedList, TenantScopedQuery } from './api-contract';

export interface QuoteFilterQuery extends TenantScopedQuery {
  status?: QuoteStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface QuoteSummaryMetrics {
  totalSalesCents: number; // Centavos inteiros
  openQuotesCount: number;
  awaitingCustomerCount: number;
  conversionRatePercent: number;
  needsFollowUpCount: number;
}

export interface IQuoteService {
  list(query: QuoteFilterQuery): Promise<ApiResponse<PaginatedList<Quote>>>;
  getSummaryMetrics(tenantId: string): Promise<ApiResponse<QuoteSummaryMetrics>>;
  getById(tenantId: string, quoteId: string): Promise<ApiResponse<Quote>>;
}

export const quoteService: IQuoteService = {
  async list(query: QuoteFilterQuery): Promise<ApiResponse<PaginatedList<Quote>>> {
    if (!query.tenantId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED_TENANT', message: 'Identificador de empresa obrigatório.' },
      };
    }
    // Estado inicial de fundação: nenhum orçamento
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

  async getSummaryMetrics(tenantId: string): Promise<ApiResponse<QuoteSummaryMetrics>> {
    if (!tenantId) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED_TENANT', message: 'Identificador de empresa obrigatório.' },
      };
    }
    // Estados vazios honestos (sem dados fictícios inventados)
    return {
      success: true,
      data: {
        totalSalesCents: 0, // R$ 0,00
        openQuotesCount: 0,
        awaitingCustomerCount: 0,
        conversionRatePercent: 0,
        needsFollowUpCount: 0,
      },
    };
  },

  async getById(tenantId: string, quoteId: string): Promise<ApiResponse<Quote>> {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: `Orçamento ${quoteId} não encontrado para empresa ${tenantId}.` },
    };
  },
};
