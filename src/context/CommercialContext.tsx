/**
 * @file CommercialContext.tsx
 * @description Contexto Comercial Oficial do OrçaGraf: Gestão de Orçamentos Gráficos, Catálogo de Produtos,
 * Descontos Comerciais, Condições de Pagamento, Download de PDF, Envio pelo WhatsApp e Integração QUOTE_APPROVED com ArteFlow.
 * @project OrçaGraf
 * 
 * NOTA DE ESCOPO:
 * O OrçaGraf gerencia propostas comerciais, precificação, descontos, catálogo de produtos e exportação.
 * O módulo Financeiro (Contas a Receber, Pagar, Caixa, DRE, etc.) reside exclusivamente no ArteFlow.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Quote,
  QuoteStatus,
  QuoteDiscount,
  QuoteFinancialTerms,
  QuoteEvent,
  QuoteVersion,
} from '../types/quote';
import { Product, Material, Finishing, FinishingPricingBasis, FinishingPriceStatus } from '../types/product';
import { Customer } from '../types/customer';
import { QuoteApprovedEventPayload } from '../types/arteflow';
import { useTenant } from './TenantContext';
import { useNotification } from './NotificationContext';
import { ArteFlowIntegrationService } from '../services/arteflow-integration.service';
import { PdfExportService } from '../services/pdf-export.service';
import { WhatsAppIntegrationService } from '../services/whatsapp-integration.service';
import { calculateQuoteTotals } from '../domain/quote-calculator';
import { formatCentsToBRL } from '../domain/money';
import { getEnvironmentCapabilities } from '../domain/environment-capabilities';
import { evaluateQuoteApproval } from '../domain/quote-approval';
import {
  getInitialProductsTemplate,
  initializeTenantProducts,
  getInitialMaterialsTemplate,
  initializeTenantMaterials,
  getInitialFinishingsTemplate,
  initializeTenantFinishings,
} from '../domain/product-catalog';
import {
  customerRepository,
  CustomerCreateInput,
  CustomerUpdateInput,
  sanitizeDocument,
} from '../domain/customer-repository';
import { quoteRepository } from '../repositories/quote.repository';
import { productRepository } from '../repositories/product.repository';
import { isModeConnected, isSupabaseConfigured } from '../services/supabase-client';

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'quot_101',
    tenantId: 'emp_alphaprint_01',
    quoteNumber: 'ORC-2026-0001',
    customerId: 'cust_01',
    customerName: 'Alfa Engenharia & Construções',
    customerContact: '(11) 98765-4321',
    customerDocument: '11.222.333/0001-44',
    customerEmail: 'compras@alfaengenharia.com.br',
    currentVersion: 1,
    status: 'approved',
    items: [
      {
        id: 'item_101',
        productId: 'prod_emp_alphaprint_01_cartao',
        productName: 'Cartão de Visita Couché 300g Laminação Fosca',
        pricingMode: 'LOT',
        quantity: 1000,
        lotSize: 1000,
        billedQuantity: 1,
        basePriceCents: 7000,
        unitCostCents: 3500,
        unitPriceCents: 7000,
        totalPriceCents: 8500,
        pricingSummary: '1.000 unidades • 1 lote(s) de 1.000 × R$ 70,00 = R$ 70,00',
        materialName: 'Papel Couché 300g',
        finishings: [
          {
            finishingId: 'fin_refile',
            name: 'Refile',
            unitPriceCents: 0,
            totalPriceCents: 0,
            isRequired: true,
            isOptional: false,
            quantity: 1000,
          },
          {
            finishingId: 'fin_lam',
            name: 'Laminação fosca',
            unitPriceCents: 1500,
            totalPriceCents: 1500,
            isRequired: false,
            isOptional: true,
            quantity: 1000,
          },
        ],
        notes: 'Corte reto padrão 9x5cm com laminação',
      },
      {
        id: 'item_102',
        productId: 'prod_emp_alphaprint_01_banner',
        productName: 'Banner em Lona Frontlight 440g',
        pricingMode: 'SQUARE_METER',
        quantity: 2,
        widthMm: 1000,
        heightMm: 1500,
        areaM2: 3.0,
        billedQuantity: 3.0,
        basePriceCents: 7000,
        unitCostCents: 3200,
        unitPriceCents: 7000,
        totalPriceCents: 18000,
        pricingSummary: '2 pç(s) 1.00×1.50m (3.00 m²) × R$ 70,00/m² = R$ 210,00',
        materialName: 'Lona Frontlight 440g',
        finishings: [
          {
            finishingId: 'fin_bainha',
            name: 'Bainha',
            unitPriceCents: 0,
            totalPriceCents: 0,
            isRequired: true,
            isOptional: false,
            quantity: 2,
          },
          {
            finishingId: 'fin_tubo',
            name: 'Tubo e cordão',
            unitPriceCents: 0,
            totalPriceCents: 0,
            isRequired: true,
            isOptional: false,
            quantity: 2,
          },
        ],
        notes: 'Acabamento em madeira redonda e ponteiras plásticas',
      },
    ],
    subtotalCents: 26500,
    discount: {
      type: 'fixed',
      value: 2650,
      appliedAmountCents: 2650,
      reason: 'Desconto comercial primeira compra',
      userId: 'usr_owner_01',
      userName: 'Carlos Henrique Silva',
      appliedAt: '2026-02-15T10:00:00Z',
    },
    discountCents: 2650,
    shippingCents: 0,
    totalCents: 23850,
    estimatedProductionDays: 3,
    paymentTerms: '50% entrada + 50% na entrega',
    financialTerms: {
      paymentMethod: 'pix',
      paymentCondition: 'down_payment_and_balance',
      installmentsCount: 2,
      downPaymentCents: 10000,
      expectedDownPaymentDate: '2026-02-15',
      installmentIntervalDays: 30,
      installments: [
        {
          installmentNumber: 1,
          dueDate: '2026-02-15',
          amountCents: 10000,
        },
        {
          installmentNumber: 2,
          dueDate: '2026-03-17',
          amountCents: 13850,
        },
      ],
    },
    salespersonId: 'usr_owner_01',
    salespersonName: 'Carlos Henrique Silva',
    versions: [],
    dataOrigin: 'demo',
    approvedAt: '2026-02-15T10:30:00Z',
    events: [
      {
        id: 'evt_01',
        quoteId: 'quot_101',
        tenantId: 'emp_alphaprint_01',
        type: 'created',
        description: 'Orçamento gerado e calculado no sistema.',
        createdAt: '2026-02-15T09:45:00Z',
        userName: 'Carlos Henrique Silva',
      },
      {
        id: 'evt_02',
        quoteId: 'quot_101',
        tenantId: 'emp_alphaprint_01',
        type: 'updated',
        description: 'Proposta comercial e PDF gerados localmente.',
        createdAt: '2026-02-15T09:50:00Z',
        userName: 'Carlos Henrique Silva',
      },
      {
        id: 'evt_03',
        quoteId: 'quot_101',
        tenantId: 'emp_alphaprint_01',
        type: 'approved',
        description: 'Orçamento aprovado pelo cliente comercialmente.',
        createdAt: '2026-02-15T10:30:00Z',
        userName: 'Carlos Henrique Silva',
      },
    ],
    createdAt: '2026-02-15T09:45:00Z',
    updatedAt: '2026-02-15T10:30:00Z',
  },
  {
    id: 'quot_102',
    tenantId: 'emp_alphaprint_01',
    quoteNumber: 'ORC-2026-0002',
    customerId: 'cust_02',
    customerName: 'Studio Beleza & Estética',
    customerContact: '(11) 97777-8888',
    customerDocument: '22.333.444/0001-55',
    customerEmail: 'contato@studiobeleza.com.br',
    currentVersion: 1,
    status: 'awaiting_customer',
    dataOrigin: 'demo',
    items: [
      {
        id: 'item_103',
        productId: 'prod_emp_alphaprint_01_folder',
        productName: 'Folder Promocional 2 Dobras Couché 150g',
        quantity: 2500,
        unitCostCents: 2200,
        unitPriceCents: 5200,
        totalPriceCents: 13000,
        materialName: 'Papel Couché 150g',
        finishings: [],
        notes: 'Dobra sanfonada com vinco preciso',
      },
    ],
    subtotalCents: 13000,
    discount: {
      type: 'none',
      value: 0,
      appliedAmountCents: 0,
    },
    discountCents: 0,
    shippingCents: 0,
    totalCents: 13000,
    estimatedProductionDays: 4,
    paymentTerms: 'À vista via Pix',
    financialTerms: {
      paymentMethod: 'pix',
      paymentCondition: 'in_cash',
      installmentsCount: 1,
      downPaymentCents: 0,
      installmentIntervalDays: 30,
      installments: [
        {
          installmentNumber: 1,
          dueDate: '2026-02-28',
          amountCents: 13000,
        },
      ],
    },
    salespersonId: 'usr_sales_01',
    salespersonName: 'Beatriz Lima (Comercial)',
    versions: [],
    events: [
      {
        id: 'evt_04',
        quoteId: 'quot_102',
        tenantId: 'emp_alphaprint_01',
        type: 'created',
        description: 'Orçamento elaborado para Studio Beleza & Estética.',
        createdAt: '2026-02-18T14:20:00Z',
        userName: 'Beatriz Lima (Comercial)',
      },
    ],
    createdAt: '2026-02-18T14:20:00Z',
    updatedAt: '2026-02-18T14:20:00Z',
  },
];

export interface CommercialMetrics {
  totalQuotes: number;
  approvedQuotes: number;
  awaitingQuotes: number;
  rejectedQuotes: number;
  totalApprovedValueCents: number;
  totalAwaitingValueCents: number;
}

interface CommercialContextValue {
  // Clientes
  customers: Customer[];
  createCustomer: (data: CustomerCreateInput) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  updateCustomer: (id: string, data: CustomerUpdateInput) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  toggleCustomerActive: (id: string) => Promise<{ success: boolean; isActive?: boolean; error?: string }>;
  findCustomerById: (id: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];

  // Orçamentos
  quotes: Quote[];
  metrics: CommercialMetrics;

  // Catálogo de Produtos, Insumos e Acabamentos
  products: Product[];
  materials: Material[];
  finishings: Finishing[];
  createProduct: (data: Partial<Product>) => Product;
  updateProduct: (id: string, data: Partial<Product>) => Product | undefined;
  toggleProductActive: (id: string) => boolean;
  duplicateProduct: (id: string) => Product | undefined;
  deleteProduct: (id: string) => { success: boolean; message: string };
  isProductUsedInQuotes: (id: string) => boolean;

  // Insumos (Materiais)
  createMaterial: (data: Partial<Material>) => Material;
  updateMaterial: (id: string, data: Partial<Material>) => Material | undefined;
  toggleMaterialActive: (id: string) => boolean;
  deleteMaterial: (id: string) => boolean;

  // Acabamentos
  createFinishing: (data: Partial<Finishing>) => Finishing;
  updateFinishing: (id: string, data: Partial<Finishing>) => Finishing | undefined;
  toggleFinishingActive: (id: string) => boolean;
  deleteFinishing: (id: string) => boolean;

  // Ações de Orçamento
  createQuote: (data: Partial<Quote>) => Quote;
  updateQuote: (quoteId: string, data: Partial<Quote>) => Quote | undefined;
  applyQuoteDiscount: (quoteId: string, discount: QuoteDiscount) => boolean;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus, reason?: string) => boolean;
  approveQuote: (quoteId: string) => { success: boolean; eventPayload?: QuoteApprovedEventPayload };
  rejectQuote: (quoteId: string, reason: string) => boolean;

  // Ações de PDF e WhatsApp
  downloadQuotePdf: (quoteId: string) => Promise<void>;
  sendQuoteViaWhatsApp: (
    quoteId: string,
    customMessage?: string,
    phone?: string
  ) => { success: boolean; messageUrl?: string; error?: string };

  // Estados de Carregamento e Servidor Real
  isLoadingCommercial: boolean;
  commercialError: string | null;
  reloadCommercialData: () => Promise<void>;
}

const CommercialContext = createContext<CommercialContextValue | undefined>(undefined);

export const CommercialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tenantId, currentCompany, currentUser, checkPermission } = useTenant();
  const { showNotice } = useNotification();

  const [isLoadingCommercial, setIsLoadingCommercial] = useState<boolean>(() => isModeConnected);
  const [commercialError, setCommercialError] = useState<string | null>(null);

  const [quotesList, setQuotesList] = useState<Quote[]>(() => (isModeConnected ? [] : INITIAL_QUOTES));
  const approvedQuoteIdsRef = useRef<Set<string>>(new Set());
  
  // Produtos por Tenant (Inicialização Idempotente)
  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    return isModeConnected ? [] : getInitialProductsTemplate('emp_alphaprint_01');
  });

  // Insumos por Tenant
  const [allMaterials, setAllMaterials] = useState<Material[]>(() => {
    return isModeConnected ? [] : getInitialMaterialsTemplate('emp_alphaprint_01');
  });

  // Acabamentos por Tenant
  const [allFinishings, setAllFinishings] = useState<Finishing[]>(() => {
    return isModeConnected ? [] : getInitialFinishingsTemplate('emp_alphaprint_01');
  });

  // Clientes por Tenant (com suporte a reatividade e persistência isolada)
  const [customersList, setCustomersList] = useState<Customer[]>([]);

  const reloadCommercialData = useCallback(async () => {
    if (!tenantId) return;

    if (isModeConnected && isSupabaseConfigured()) {
      setIsLoadingCommercial(true);
      setCommercialError(null);
      try {
        const [loadedQuotes, loadedProds, loadedMats, loadedFins, loadedCusts] = await Promise.all([
          quoteRepository.listQuotes(tenantId),
          productRepository.listProducts(tenantId),
          productRepository.listMaterials(tenantId),
          productRepository.listFinishings(tenantId),
          customerRepository.list(tenantId),
        ]);
        setQuotesList(loadedQuotes);
        setAllProducts(loadedProds);
        setAllMaterials(loadedMats);
        setAllFinishings(loadedFins);
        setCustomersList(loadedCusts);
      } catch (err: any) {
        console.error('[CommercialContext] Erro ao carregar dados do Supabase:', err);
        setCommercialError(err?.message || 'Erro ao carregar dados comerciais do servidor.');
        // FAIL-CLOSED: Não restaura dados seed em modo conectado
        setQuotesList([]);
        setAllProducts([]);
        setAllMaterials([]);
        setAllFinishings([]);
        setCustomersList([]);
      } finally {
        setIsLoadingCommercial(false);
      }
    } else {
      // Modo Standalone: inicialização template local
      setAllProducts(prev => initializeTenantProducts(prev, tenantId));
      setAllMaterials(prev => initializeTenantMaterials(prev, tenantId));
      setAllFinishings(prev => initializeTenantFinishings(prev, tenantId));
      const custs = await customerRepository.list(tenantId);
      setCustomersList(custs);
    }
  }, [tenantId]);

  useEffect(() => {
    reloadCommercialData();
  }, [reloadCommercialData]);

  const reloadCustomers = useCallback(async () => {
    const list = await customerRepository.list(tenantId);
    setCustomersList(list);
  }, [tenantId]);

  // Produtos exclusivos do tenant atual
  const tenantProducts = useMemo(() => {
    return allProducts.filter(p => p.tenantId === tenantId);
  }, [allProducts, tenantId]);

  // Insumos exclusivos do tenant atual
  const tenantMaterials = useMemo(() => {
    return allMaterials.filter(m => m.tenantId === tenantId);
  }, [allMaterials, tenantId]);

  // Acabamentos exclusivos do tenant atual
  const tenantFinishings = useMemo(() => {
    return allFinishings.filter(f => f.tenantId === tenantId);
  }, [allFinishings, tenantId]);

  const createCustomer = async (
    data: CustomerCreateInput
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
    const result = await customerRepository.create(tenantId, data);
    if (result.success && result.customer) {
      await reloadCustomers();
      showNotice('Cliente Cadastrado', `Cliente "${result.customer.name}" foi cadastrado com sucesso.`, 'success');
    } else if (result.error) {
      showNotice('Erro no Cadastro', result.error, 'warning');
    }
    return result;
  };

  const updateCustomer = async (
    id: string,
    data: CustomerUpdateInput
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
    const result = await customerRepository.update(tenantId, id, data);
    if (result.success && result.customer) {
      await reloadCustomers();
      showNotice('Cliente Atualizado', `Cadastro de "${result.customer.name}" foi atualizado.`, 'success');
    } else if (result.error) {
      showNotice('Erro ao Atualizar', result.error, 'warning');
    }
    return result;
  };

  const toggleCustomerActive = async (
    id: string
  ): Promise<{ success: boolean; isActive?: boolean; error?: string }> => {
    const result = await customerRepository.toggleActive(tenantId, id);
    if (result.success) {
      await reloadCustomers();
      showNotice(
        result.isActive ? 'Cliente Ativado' : 'Cliente Desativado',
        `Status do cliente alterado para ${result.isActive ? 'ativo' : 'inativo'}.`,
        'info'
      );
    }
    return result;
  };

  const findCustomerById = (id: string): Customer | undefined => {
    return customersList.find(c => c.id === id && c.tenantId === tenantId);
  };

  const searchCustomers = (query: string): Customer[] => {
    if (!query.trim()) return customersList;
    const term = query.trim().toLowerCase();
    const cleanTerm = sanitizeDocument(term);
    return customersList.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(term);
      const corpMatch = (c.corporateName || '').toLowerCase().includes(term);
      const emailMatch = (c.email || '').toLowerCase().includes(term);
      const phoneMatch = (c.phone || '').includes(term) || (c.whatsapp || '').includes(term);
      const docClean = sanitizeDocument(c.document);
      const docMatch = (c.document || '').includes(term) || (cleanTerm && docClean.includes(cleanTerm));
      return nameMatch || corpMatch || emailMatch || phoneMatch || Boolean(docMatch);
    });
  };

  // Orçamentos exclusivos do tenant atual
  const currentTenantQuotes = useMemo(() => {
    return quotesList.filter(q => q.tenantId === tenantId);
  }, [quotesList, tenantId]);

  // Verifica se um produto está sendo usado em orçamentos existentes
  const isProductUsedInQuotes = (productId: string): boolean => {
    return currentTenantQuotes.some(q => q.items.some(item => item.productId === productId));
  };

  // Criação de Produto no Catálogo
  const createProduct = (data: Partial<Product>): Product => {
    const now = new Date().toISOString();
    const mode = data.pricingMode || (data.calculationUnit === 'm2' || data.calculationUnit === 'cm2' ? 'SQUARE_METER' : data.calculationUnit === 'linear_meter' ? 'LINEAR_METER' : data.calculationUnit === 'pack' ? 'LOT' : 'UNIT');
    const newProduct: Product = {
      id: `prod_${tenantId}_${Date.now()}`,
      tenantId,
      sku: data.sku?.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      name: data.name?.trim() || 'Novo Produto Gráfico',
      category: data.category || 'prints',
      shortDescription: data.shortDescription?.trim() || '',
      pricingMode: mode,
      lotSize: data.lotSize || (mode === 'LOT' ? 1000 : undefined),
      calculationUnit: data.calculationUnit || 'unit',
      defaultWidthMm: data.defaultWidthMm,
      defaultHeightMm: data.defaultHeightMm,
      defaultQuantity: data.defaultQuantity || 1,
      defaultMaterial: data.defaultMaterial || '',
      availableMaterials: data.availableMaterials || (data.defaultMaterial ? [data.defaultMaterial] : []),
      defaultFinishing: data.defaultFinishing || '',
      availableFinishings: data.availableFinishings || (data.defaultFinishing ? [data.defaultFinishing] : []),
      productionDays: data.productionDays || 2,
      baseCostCents: data.baseCostCents || 0,
      markupPercent: data.markupPercent || 100,
      salePriceCents: data.salePriceCents || 0,
      minSalePriceCents: data.minSalePriceCents || 0,
      hasPriceConfigured: (data.salePriceCents || 0) > 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      internalNotes: data.internalNotes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    setAllProducts(prev => [newProduct, ...prev]);

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository
        .createProduct(tenantId, newProduct)
        .then(res => {
          if (res.success && res.product) {
            setAllProducts(prev => prev.map(p => (p.id === newProduct.id ? res.product! : p)));
          } else if (res.error) {
            showNotice('Erro ao Salvar Produto', res.error, 'error');
            setAllProducts(prev => prev.filter(p => p.id !== newProduct.id));
          }
        })
        .catch(err => {
          showNotice('Falha de Rede', err.message, 'error');
          setAllProducts(prev => prev.filter(p => p.id !== newProduct.id));
        });
    }

    showNotice('Produto Cadastrado', `${newProduct.name} adicionado ao catálogo com sucesso!`, 'success');
    return newProduct;
  };

  // Edição de Produto
  const updateProduct = (id: string, data: Partial<Product>): Product | undefined => {
    let updated: Product | undefined;
    const now = new Date().toISOString();

    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === id && p.tenantId === tenantId) {
          const hasPrice = data.salePriceCents !== undefined ? data.salePriceCents > 0 : p.salePriceCents > 0;
          updated = {
            ...p,
            ...data,
            hasPriceConfigured: hasPrice,
            updatedAt: now,
          };
          return updated;
        }
        return p;
      })
    );

    if (updated) {
      showNotice('Produto Atualizado', `As configurações de ${(updated as Product).name} foram salvas.`, 'success');
      if (isModeConnected && isSupabaseConfigured()) {
        productRepository.updateProduct(tenantId, id, data).then(res => {
          if (res.error) {
            showNotice('Erro ao Salvar no Servidor', res.error, 'error');
          }
        });
      }
    }
    return updated;
  };

  // Alternar Ativação
  const toggleProductActive = (id: string): boolean => {
    let newState = false;
    let prodName = '';
    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === id && p.tenantId === tenantId) {
          newState = !p.isActive;
          prodName = p.name;
          return { ...p, isActive: newState, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.updateProduct(tenantId, id, { isActive: newState });
    }

    showNotice(
      newState ? 'Produto Ativado' : 'Produto Desativado',
      `${prodName} foi ${newState ? 'ativado para novos orçamentos' : 'desativado do catálogo'}.`,
      'info'
    );
    return newState;
  };

  // Duplicar Produto
  const duplicateProduct = (id: string): Product | undefined => {
    const existing = tenantProducts.find(p => p.id === id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const cloned: Product = {
      ...existing,
      id: `prod_${tenantId}_${Date.now()}`,
      sku: `${existing.sku}-COPIA`,
      name: `${existing.name} (Cópia)`,
      createdAt: now,
      updatedAt: now,
    };

    setAllProducts(prev => [cloned, ...prev]);

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.createProduct(tenantId, cloned).then(res => {
        if (res.success && res.product) {
          setAllProducts(prev => prev.map(p => (p.id === cloned.id ? res.product! : p)));
        }
      });
    }

    showNotice('Produto Duplicado', `Cópia criada: ${cloned.name}`, 'success');
    return cloned;
  };

  // Excluir Produto (com regra estrita: não exclui se estiver em orçamentos!)
  const deleteProduct = (id: string): { success: boolean; message: string } => {
    const target = tenantProducts.find(p => p.id === id);
    if (!target) {
      return { success: false, message: 'Produto não encontrado.' };
    }

    const inUse = isProductUsedInQuotes(id);
    if (inUse) {
      showNotice(
        'Exclusão Bloqueada',
        `O item "${target.name}" já está vinculado a orçamentos emitidos. Para removê-lo de novos orçamentos, você pode desativá-lo.`,
        'warning'
      );
      return {
        success: false,
        message: 'Produto vinculado a orçamentos existentes. Apenas desativação permitida.',
      };
    }

    setAllProducts(prev => prev.filter(p => !(p.id === id && p.tenantId === tenantId)));

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.deleteProduct(tenantId, id).then(res => {
        if (res.error) {
          showNotice('Erro ao Excluir no Servidor', res.error, 'error');
        }
      });
    }

    showNotice('Produto Removido', `O item "${target.name}" foi excluído permanentemente do catálogo.`, 'info');
    return { success: true, message: 'Produto removido com sucesso.' };
  };

  // ==========================================
  // INSUMOS (MATERIAIS) CRUD
  // ==========================================
  const createMaterial = (data: Partial<Material>): Material => {
    const now = new Date().toISOString();
    const newMat: Material = {
      id: `mat_${tenantId}_${Date.now()}`,
      tenantId,
      name: data.name?.trim() || 'Novo Insumo',
      category: data.category?.trim() || 'Geral',
      unit: data.unit || 'sheet',
      costPriceCents: data.costPriceCents || 0,
      salePriceCents: data.salePriceCents || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    setAllMaterials(prev => [newMat, ...prev]);

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository
        .createMaterial(tenantId, newMat)
        .then(res => {
          if (res.success && res.material) {
            setAllMaterials(prev => prev.map(m => (m.id === newMat.id ? res.material! : m)));
          } else if (res.error) {
            showNotice('Erro ao Salvar Insumo', res.error, 'error');
            setAllMaterials(prev => prev.filter(m => m.id !== newMat.id));
          }
        })
        .catch(err => {
          showNotice('Falha de Rede', err.message, 'error');
          setAllMaterials(prev => prev.filter(m => m.id !== newMat.id));
        });
    }

    showNotice('Insumo Cadastrado', `${newMat.name} adicionado com sucesso.`, 'success');
    return newMat;
  };

  const updateMaterial = (id: string, data: Partial<Material>): Material | undefined => {
    let updated: Material | undefined;
    const now = new Date().toISOString();
    setAllMaterials(prev =>
      prev.map(m => {
        if (m.id === id && m.tenantId === tenantId) {
          updated = { ...m, ...data, updatedAt: now };
          return updated;
        }
        return m;
      })
    );
    if (updated) {
      showNotice('Insumo Atualizado', `${(updated as Material).name} atualizado.`, 'success');
      if (isModeConnected && isSupabaseConfigured()) {
        productRepository.updateMaterial(tenantId, id, data).then(res => {
          if (res.error) {
            showNotice('Erro ao Atualizar no Servidor', res.error, 'error');
          }
        });
      }
    }
    return updated;
  };

  const toggleMaterialActive = (id: string): boolean => {
    let newState = false;
    let name = '';
    setAllMaterials(prev =>
      prev.map(m => {
        if (m.id === id && m.tenantId === tenantId) {
          newState = !m.isActive;
          name = m.name;
          return { ...m, isActive: newState, updatedAt: new Date().toISOString() };
        }
        return m;
      })
    );

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.updateMaterial(tenantId, id, { isActive: newState });
    }

    showNotice(
      newState ? 'Insumo Ativado' : 'Insumo Desativado',
      `${name} foi ${newState ? 'ativado' : 'desativado'}.`,
      'info'
    );
    return newState;
  };

  const deleteMaterial = (id: string): boolean => {
    setAllMaterials(prev => prev.filter(m => !(m.id === id && m.tenantId === tenantId)));
    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.deleteMaterial(tenantId, id).then(res => {
        if (res.error) {
          showNotice('Erro ao Excluir no Servidor', res.error, 'error');
        }
      });
    }
    showNotice('Insumo Removido', 'Insumo excluído do catálogo.', 'info');
    return true;
  };

  // ==========================================
  // ACABAMENTOS CRUD
  // ==========================================
  const createFinishing = (data: Partial<Finishing>): Finishing => {
    const now = new Date().toISOString();
    const basis = (data.pricingBasis || data.pricingMethod || 'PER_UNIT') as FinishingPricingBasis;
    const priceCents = data.priceCents !== undefined ? data.priceCents : (data.costPriceCents || data.salePriceCents || 0);
    const status: FinishingPriceStatus = data.priceStatus || (priceCents > 0 ? 'CONFIGURED' : data.isRequired ? 'FREE' : 'NOT_CONFIGURED');

    const compatibleProductIds = Array.isArray(data.compatibleProductIds) ? data.compatibleProductIds : [];
    const appliesToAllProducts = Boolean(data.appliesToAllProducts);

    const newFin: Finishing = {
      id: `fin_${tenantId}_${Date.now()}`,
      tenantId,
      name: data.name?.trim() || 'Novo Acabamento',
      description: data.description?.trim() || '',
      pricingBasis: basis,
      pricingMethod: basis,
      priceCents,
      costPriceCents: priceCents,
      salePriceCents: priceCents,
      priceStatus: status,
      defaultMarkupPercent: data.defaultMarkupPercent || 0,
      compatibleProductIds,
      appliesToAllProducts,
      compatibleProducts: data.compatibleProducts || [],
      isRequired: Boolean(data.isRequired),
      isDefaultSelected: Boolean(data.isDefaultSelected),
      isActive: data.isActive !== undefined ? data.isActive : true,
      notes: data.notes?.trim() || '',
      dataOrigin: 'user',
      createdAt: now,
      updatedAt: now,
    };
    setAllFinishings(prev => [newFin, ...prev]);

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository
        .createFinishing(tenantId, newFin)
        .then(res => {
          if (res.success && res.finishing) {
            setAllFinishings(prev => prev.map(f => (f.id === newFin.id ? res.finishing! : f)));
          } else if (res.error) {
            showNotice('Erro ao Salvar Acabamento', res.error, 'error');
            setAllFinishings(prev => prev.filter(f => f.id !== newFin.id));
          }
        })
        .catch(err => {
          showNotice('Falha de Rede', err.message, 'error');
          setAllFinishings(prev => prev.filter(f => f.id !== newFin.id));
        });
    }

    showNotice('Acabamento Cadastrado', `${newFin.name} adicionado ao catálogo.`, 'success');
    return newFin;
  };

  const updateFinishing = (id: string, data: Partial<Finishing>): Finishing | undefined => {
    let updated: Finishing | undefined;
    const now = new Date().toISOString();
    setAllFinishings(prev =>
      prev.map(f => {
        if (f.id === id && f.tenantId === tenantId) {
          const basis = (data.pricingBasis || data.pricingMethod || f.pricingBasis || f.pricingMethod || 'PER_UNIT') as FinishingPricingBasis;
          const priceCents = data.priceCents !== undefined ? data.priceCents : (data.costPriceCents !== undefined ? data.costPriceCents : f.priceCents);
          const status = data.priceStatus || f.priceStatus || (priceCents > 0 ? 'CONFIGURED' : (data.isRequired ?? f.isRequired) ? 'FREE' : 'NOT_CONFIGURED');
          const compatibleProductIds = Array.isArray(data.compatibleProductIds) ? data.compatibleProductIds : (f.compatibleProductIds || []);
          const appliesToAllProducts = data.appliesToAllProducts !== undefined ? Boolean(data.appliesToAllProducts) : Boolean(f.appliesToAllProducts);

          updated = {
            ...f,
            ...data,
            pricingBasis: basis,
            pricingMethod: basis,
            priceCents,
            costPriceCents: priceCents,
            salePriceCents: priceCents,
            priceStatus: status,
            compatibleProductIds,
            appliesToAllProducts,
            updatedAt: now,
          };
          return updated;
        }
        return f;
      })
    );
    if (updated) {
      showNotice('Acabamento Atualizado', `${(updated as Finishing).name} atualizado.`, 'success');
      if (isModeConnected && isSupabaseConfigured()) {
        productRepository.updateFinishing(tenantId, id, data).then(res => {
          if (res.error) {
            showNotice('Erro ao Atualizar no Servidor', res.error, 'error');
          }
        });
      }
    }
    return updated;
  };

  const toggleFinishingActive = (id: string): boolean => {
    let newState = false;
    let name = '';
    setAllFinishings(prev =>
      prev.map(f => {
        if (f.id === id && f.tenantId === tenantId) {
          newState = !f.isActive;
          name = f.name;
          return { ...f, isActive: newState, updatedAt: new Date().toISOString() };
        }
        return f;
      })
    );

    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.updateFinishing(tenantId, id, { isActive: newState });
    }

    showNotice(
      newState ? 'Acabamento Ativado' : 'Acabamento Desativado',
      `${name} foi ${newState ? 'ativado' : 'desativado'}.`,
      'info'
    );
    return newState;
  };

  const deleteFinishing = (id: string): boolean => {
    setAllFinishings(prev => prev.filter(f => !(f.id === id && f.tenantId === tenantId)));
    if (isModeConnected && isSupabaseConfigured()) {
      productRepository.deleteFinishing(tenantId, id).then(res => {
        if (res.error) {
          showNotice('Erro ao Excluir no Servidor', res.error, 'error');
        }
      });
    }
    showNotice('Acabamento Removido', 'Acabamento excluído do catálogo.', 'info');
    return true;
  };

  // Cálculo de Métricas Comerciais da Gráfica
  const metrics: CommercialMetrics = useMemo(() => {
    const total = currentTenantQuotes.length;
    const approved = currentTenantQuotes.filter(q => q.status === 'approved');
    const awaiting = currentTenantQuotes.filter(q => q.status === 'awaiting_customer');
    const rejected = currentTenantQuotes.filter(q => q.status === 'rejected');

    const totalApprovedCents = approved.reduce((acc, q) => acc + (q.totalCents || 0), 0);
    const totalAwaitingCents = awaiting.reduce((acc, q) => acc + (q.totalCents || 0), 0);

    return {
      totalQuotes: total,
      approvedQuotes: approved.length,
      awaitingQuotes: awaiting.length,
      rejectedQuotes: rejected.length,
      totalApprovedValueCents: totalApprovedCents,
      totalAwaitingValueCents: totalAwaitingCents,
    };
  }, [currentTenantQuotes]);

  // Criação de Orçamento
  const createQuote = (data: Partial<Quote>): Quote => {
    const now = new Date().toISOString();
    const countForTenant = currentTenantQuotes.length + 1;
    const quoteNum = `ORC-2026-${countForTenant.toString().padStart(4, '0')}`;

    const items = data.items || [];
    const subtotal = items.reduce((acc, it) => acc + (it.totalPriceCents || 0), 0);
    const discount = data.discount || { type: 'none', value: 0, appliedAmountCents: 0 };
    const { appliedAmountCents, totalFinalCents } = calculateQuoteTotals(subtotal, discount);

    const initialFinancialTerms: QuoteFinancialTerms = data.financialTerms || {
      paymentMethod: 'to_be_defined',
      paymentCondition: 'in_cash',
      installmentsCount: 1,
      downPaymentCents: 0,
      installmentIntervalDays: 30,
      installments: [
        {
          installmentNumber: 1,
          dueDate: new Date().toISOString().split('T')[0],
          amountCents: totalFinalCents,
        },
      ],
    };

    const newQuote: Quote = {
      id: `quot_${Date.now()}`,
      tenantId,
      quoteNumber: quoteNum,
      customerId: data.customerId || `cust_${Date.now()}`,
      customerName: data.customerName || 'Cliente Balcão',
      customerContact: data.customerContact,
      customerDocument: data.customerDocument,
      customerEmail: data.customerEmail,
      currentVersion: 1,
      status: 'awaiting_customer',
      items,
      subtotalCents: subtotal,
      discount: {
        ...discount,
        appliedAmountCents: appliedAmountCents,
        userId: currentUser.id,
        userName: currentUser.name,
        appliedAt: discount.type !== 'none' ? now : undefined,
      },
      discountCents: appliedAmountCents,
      shippingCents: data.shippingCents || 0,
      totalCents: totalFinalCents,
      estimatedProductionDays: data.estimatedProductionDays || currentCompany.customization.defaultProductionDays || 3,
      paymentTerms: data.paymentTerms || 'A combinar com o setor comercial',
      financialTerms: initialFinancialTerms,
      salespersonId: data.salespersonId !== undefined ? data.salespersonId : (data.sellerId !== undefined ? data.sellerId : null),
      salespersonName: data.salespersonName !== undefined ? data.salespersonName : (data.sellerName !== undefined ? data.sellerName : null),
      sellerId: data.sellerId !== undefined ? data.sellerId : (data.salespersonId !== undefined ? data.salespersonId : null),
      sellerName: data.sellerName !== undefined ? data.sellerName : (data.salespersonName !== undefined ? data.salespersonName : null),
      commissionRatePercent: data.commissionRatePercent ?? null,
      commissionAmountCents: data.commissionAmountCents ?? null,
      versions: [],
      dataOrigin: 'user',
      events: [
        {
          id: `evt_${Date.now()}`,
          quoteId: `quot_${Date.now()}`,
          tenantId,
          type: 'created',
          description: `Orçamento comercial emitido no valor de ${formatCentsToBRL(totalFinalCents)}.`,
          createdAt: now,
          userId: currentUser.id,
          userName: currentUser.name,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    setQuotesList(prev => [newQuote, ...prev]);

    if (isModeConnected && isSupabaseConfigured()) {
      quoteRepository
        .createQuote(tenantId, newQuote, items)
        .then(res => {
          if (res.success && res.quote) {
            setQuotesList(prev => prev.map(q => (q.id === newQuote.id ? res.quote! : q)));
            showNotice('Orçamento Emitido', `Proposta ${res.quote.quoteNumber} salva no servidor com sucesso!`, 'success');
          } else if (res.error) {
            showNotice('Erro ao Salvar no Servidor', res.error, 'error');
            setQuotesList(prev => prev.filter(q => q.id !== newQuote.id));
          }
        })
        .catch(err => {
          showNotice('Falha de Rede', err.message || 'Erro ao comunicar com o servidor.', 'error');
          setQuotesList(prev => prev.filter(q => q.id !== newQuote.id));
        });
    } else {
      showNotice('Orçamento Criado', `Proposta ${quoteNum} salva e pronta para envio!`, 'success');
    }

    return newQuote;
  };

  // Atualização de Orçamento
  const updateQuote = (quoteId: string, data: Partial<Quote>): Quote | undefined => {
    let updated: Quote | undefined;

    setQuotesList(prev =>
      prev.map(q => {
        if (q.id !== quoteId || q.tenantId !== tenantId) return q;

        const items = data.items !== undefined ? data.items : q.items;
        const subtotal = items.reduce((acc, it) => acc + (it.totalPriceCents || 0), 0);
        const discount = data.discount !== undefined ? data.discount : q.discount;
        const { appliedAmountCents, totalFinalCents } = calculateQuoteTotals(subtotal, discount);

        const newEvent: QuoteEvent = {
          id: `evt_${Date.now()}_upd`,
          quoteId: q.id,
          tenantId,
          type: 'updated',
          description: 'Orçamento atualizado pelo vendedor.',
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
        };

        updated = {
          ...q,
          ...data,
          items,
          subtotalCents: subtotal,
          discount: {
            ...discount,
            appliedAmountCents: appliedAmountCents,
          },
          discountCents: appliedAmountCents,
          totalCents: totalFinalCents,
          events: [newEvent, ...(q.events || [])],
          updatedAt: new Date().toISOString(),
        };

        return updated;
      })
    );

    if (updated) {
      showNotice('Orçamento Atualizado', `Alterações salvas com sucesso.`, 'success');
      if (isModeConnected && isSupabaseConfigured()) {
        const expectedVer = (updated as Quote).currentVersion || 1;
        quoteRepository
          .updateQuote(tenantId, quoteId, expectedVer, updated, (updated as Quote).items)
          .then(res => {
            if (res.error) {
              showNotice('Erro ao Atualizar no Servidor', res.error, 'error');
            }
          });
      }
    }
    return updated;
  };

  // Aplicação de Desconto Comercial
  const applyQuoteDiscount = (quoteId: string, discount: QuoteDiscount): boolean => {
    let success = false;

    setQuotesList(prev =>
      prev.map(q => {
        if (q.id !== quoteId || q.tenantId !== tenantId) return q;

        const { appliedAmountCents, totalFinalCents } = calculateQuoteTotals(q.subtotalCents, discount);

        const discountEvent: QuoteEvent = {
          id: `evt_${Date.now()}_disc`,
          quoteId: q.id,
          tenantId,
          type: 'discount_applied',
          description: `Desconto aplicado (${discount.type === 'percentage' ? discount.value + '%' : 'Valor Fixo'}): ${formatCentsToBRL(appliedAmountCents)}. Motivo: ${discount.reason || 'Negociação comercial'}.`,
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
        };

        success = true;
        return {
          ...q,
          discount: {
            ...discount,
            appliedAmountCents: appliedAmountCents,
            userId: currentUser.id,
            userName: currentUser.name,
            appliedAt: new Date().toISOString(),
          },
          discountCents: appliedAmountCents,
          totalCents: totalFinalCents,
          events: [discountEvent, ...(q.events || [])],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    if (success) {
      showNotice('Desconto Aplicado', 'Novo valor total recalculado.', 'success');
    }
    return success;
  };

  // Atualização de Status
  const updateQuoteStatus = (quoteId: string, status: QuoteStatus, reason?: string): boolean => {
    if (status === 'approved') {
      return approveQuote(quoteId).success;
    }
    let success = false;
    setQuotesList(prev =>
      prev.map(q => {
        if (q.id !== quoteId || q.tenantId !== tenantId) return q;
        success = true;
        const evt: QuoteEvent = {
          id: `evt_${Date.now()}_st`,
          quoteId: q.id,
          tenantId,
          type: status === 'rejected' ? 'rejected' : 'updated',
          description: `Status alterado para "${status === 'rejected' ? 'Recusado' : 'Aguardando Cliente'}". ${reason ? 'Motivo: ' + reason : ''}`,
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
        };
        return {
          ...q,
          status,
          events: [evt, ...(q.events || [])],
          updatedAt: new Date().toISOString(),
        };
      })
    );
    return success;
  };

  // Aprovação de Orçamento
  const approveQuote = (quoteId: string): { success: boolean; eventPayload?: QuoteApprovedEventPayload } => {
    const targetQuote = currentTenantQuotes.find(q => q.id === quoteId);
    if (!targetQuote) {
      showNotice('Erro ao Aprovar', 'Orçamento não encontrado para esta empresa.', 'error');
      return { success: false };
    }

    if (approvedQuoteIdsRef.current.has(quoteId)) {
      showNotice('Já Aprovado', 'Este orçamento já consta como aprovado.', 'info');
      return { success: true };
    }

    const decision = evaluateQuoteApproval(targetQuote, tenantId, currentUser);
    if ('reason' in decision) {
      showNotice(
        decision.idempotent ? 'Já Aprovado' : 'Aprovação não permitida',
        decision.message,
        decision.idempotent ? 'info' : 'error'
      );
      return { success: Boolean(decision.idempotent) };
    }

    approvedQuoteIdsRef.current.add(quoteId);

    const capabilities = getEnvironmentCapabilities();
    const payload = capabilities.canUseArteFlow
      ? ArteFlowIntegrationService.buildQuoteApprovedEvent(targetQuote, currentUser)
      : undefined;

    const now = new Date().toISOString();
    setQuotesList(prev =>
      prev.map(q => {
        if (q.id !== quoteId || q.tenantId !== tenantId) return q;
        const approveEvent: QuoteEvent = {
          id: `evt_${Date.now()}_appr`,
          quoteId: q.id,
          tenantId,
          type: 'approved',
          description: 'Orçamento aprovado pelo cliente comercialmente.',
          createdAt: now,
          userId: currentUser.id,
          userName: currentUser.name,
        };
        return {
          ...q,
          status: 'approved',
          approvedAt: now,
          events: [approveEvent, ...(q.events || [])],
          updatedAt: now,
        };
      })
    );

    if (isModeConnected && isSupabaseConfigured()) {
      quoteRepository
        .approveQuote(tenantId, quoteId, 'Aprovado via interface comercial')
        .then(res => {
          if (res.error) {
            showNotice('Erro ao Salvar Aprovação', res.error, 'error');
          }
        });
    }

    showNotice(
      'Orçamento Aprovado',
      'Orçamento aprovado comercialmente com sucesso!',
      'success'
    );
    return { success: true, eventPayload: payload };
  };

  // Recusa de Orçamento
  const rejectQuote = (quoteId: string, reason: string): boolean => {
    const targetQuote = currentTenantQuotes.find(q => q.id === quoteId);
    if (!targetQuote) return false;

    const now = new Date().toISOString();
    setQuotesList(prev =>
      prev.map(q => {
        if (q.id !== quoteId || q.tenantId !== tenantId) return q;
        const rejectEvent: QuoteEvent = {
          id: `evt_${Date.now()}_rej`,
          quoteId: q.id,
          tenantId,
          type: 'rejected',
          description: `Orçamento marcado como recusado pelo cliente. Motivo: ${reason}`,
          createdAt: now,
          userId: currentUser.id,
          userName: currentUser.name,
        };
        return {
          ...q,
          status: 'rejected',
          events: [rejectEvent, ...(q.events || [])],
          updatedAt: now,
        };
      })
    );

    if (isModeConnected && isSupabaseConfigured()) {
      quoteRepository.rejectQuote(tenantId, quoteId, reason).then(res => {
        if (res.error) {
          showNotice('Erro ao Salvar Recusa', res.error, 'error');
        }
      });
    }

    showNotice('Orçamento Recusado', `Status atualizado para Recusado.`, 'info');
    return true;
  };

  // Download do PDF Vetorial A4
  const downloadQuotePdf = async (quoteId: string): Promise<void> => {
    const quote = currentTenantQuotes.find(q => q.id === quoteId);
    if (!quote) {
      showNotice('Erro ao Baixar PDF', 'Orçamento não encontrado.', 'error');
      return;
    }

    try {
      await PdfExportService.generateAndDownloadQuotePdf(quote, currentCompany);
      showNotice(
        'PDF Gerado com Sucesso',
        `Arquivo ${PdfExportService.getQuotePdfFilename(quote)} baixado com sucesso.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showNotice('Falha na Geração do PDF', 'Não foi possível compilar o documento PDF.', 'error');
    }
  };

  // Envio pelo WhatsApp (Desativado em Standalone com explicação honesta)
  const sendQuoteViaWhatsApp = (
    quoteId: string,
    customMessage?: string,
    phone?: string
  ): { success: boolean; messageUrl?: string; error?: string } => {
    const capabilities = getEnvironmentCapabilities();
    if (!capabilities.canUseWhatsApp) {
      showNotice(
        'WhatsApp Não Configurado',
        'A integração oficial com o WhatsApp Business ainda não está configurada neste ambiente.',
        'info'
      );
      return {
        success: false,
        error: 'A integração oficial com o WhatsApp Business ainda não está configurada neste ambiente.',
      };
    }

    const quote = currentTenantQuotes.find(q => q.id === quoteId);
    if (!quote) {
      return { success: false, error: 'Orçamento não encontrado.' };
    }

    const dispatch = WhatsAppIntegrationService.prepareQuoteDispatch(
      quote,
      currentCompany,
      customMessage,
      phone
    );

    if (!dispatch.canSend) {
      return { success: false, error: dispatch.errorReason || 'Telefone inválido para envio.' };
    }

    // Registra evento no histórico do orçamento sem alterar status
    const now = new Date().toISOString();
    const event: QuoteEvent = {
      id: `evt_${Date.now()}_wpp`,
      quoteId: quote.id,
      tenantId,
      type: 'sent_whatsapp',
      description: `Proposta comercial enviada pelo WhatsApp para o número +${dispatch.recipientPhone}.`,
      createdAt: now,
      userId: currentUser.id,
      userName: currentUser.name,
    };

    setQuotesList(prev =>
      prev.map(q => (q.id === quoteId ? { ...q, events: [event, ...(q.events || [])] } : q))
    );

    // Abre o WhatsApp Web / App
    window.open(dispatch.webActionUrl, '_blank', 'noopener,noreferrer');
    showNotice('WhatsApp Aberto', `Conversa iniciada com +${dispatch.recipientPhone}.`, 'success');
    return { success: true, messageUrl: dispatch.webActionUrl };
  };

  return (
    <CommercialContext.Provider
      value={{
        customers: customersList,
        createCustomer,
        updateCustomer,
        toggleCustomerActive,
        findCustomerById,
        searchCustomers,
        quotes: currentTenantQuotes,
        metrics,
        products: tenantProducts,
        materials: tenantMaterials,
        finishings: tenantFinishings,
        createProduct,
        updateProduct,
        toggleProductActive,
        duplicateProduct,
        deleteProduct,
        isProductUsedInQuotes,
        createMaterial,
        updateMaterial,
        toggleMaterialActive,
        deleteMaterial,
        createFinishing,
        updateFinishing,
        toggleFinishingActive,
        deleteFinishing,
        createQuote,
        updateQuote,
        applyQuoteDiscount,
        updateQuoteStatus,
        approveQuote,
        rejectQuote,
        downloadQuotePdf,
        sendQuoteViaWhatsApp,
        isLoadingCommercial,
        commercialError,
        reloadCommercialData,
      }}
    >
      {children}
    </CommercialContext.Provider>
  );
};

export const useCommercial = (): CommercialContextValue => {
  const context = useContext(CommercialContext);
  if (!context) {
    throw new Error('useCommercial deve ser usado dentro de um CommercialProvider');
  }
  return context;
};
