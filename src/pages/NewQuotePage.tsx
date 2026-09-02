/**
 * @file NewQuotePage.tsx
 * @description Elaboração e Precificação de Orçamentos Gráficos, Acabamentos Vinculados, Fluxo de Desconto com Confirmação e Vendedor/Comissão Opcionais ao Final
 * @project OrçaGraf
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Percent,
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  User as UserIcon,
  Package,
  Search,
  CheckCircle2,
  Layers,
  Scissors,
  Maximize2,
  Lock,
  ChevronDown,
  Check,
  Info,
  UserCheck,
  Edit3,
  X,
  DollarSign,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useTenant } from '../context/TenantContext';
import { useCommercial } from '../context/CommercialContext';
import { useNotification } from '../context/NotificationContext';
import { Customer } from '../types/customer';
import {
  QuoteDiscountType,
  PaymentMethod,
  PaymentCondition,
  QuoteItemFinishing,
} from '../types/quote';
import {
  Product,
  CalculationUnit,
  PRODUCT_CATEGORIES,
  Finishing,
  PricingMode,
  PRICING_MODES,
  FinishingPricingBasis,
  FinishingPriceStatus,
} from '../types/product';
import { User, hasUserPermission } from '../types/tenant';
import { formatCentsToBRL, parseBRLToCents } from '../domain/money';
import { calculateInstallments } from '../domain/financial-calculations';
import { calculateItemPricing, inferPricingMode, formatItemPricingDescription } from '../domain/pricing-engine';
import { isFinishingCompatibleWithProduct } from '../domain/product-catalog';

interface NewQuotePageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export interface FormQuoteItemFinishing {
  finishingId: string;
  name: string;
  description?: string;
  pricingBasis: FinishingPricingBasis;
  unitPriceCents: number;
  totalPriceCents: number;
  priceStatus: FinishingPriceStatus;
  calculationMemory?: string;
  isRequired: boolean;
  isOptional: boolean;
  isAdditional?: boolean;
  selected: boolean;
  quantity?: number;
  notes?: string;
  hasPriceConfigured: boolean;
}

interface FormQuoteItem {
  id: string;
  productId?: string;
  isCustom: boolean;
  productName: string;
  category?: string;
  pricingMode: PricingMode;
  lotSize?: number;
  billedQuantity?: number;
  calculationUnit: CalculationUnit;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  lengthMeters?: number;
  areaM2?: number;
  linearMeters?: number;
  materialName: string;
  availableMaterials: string[];
  finishings: FormQuoteItemFinishing[];
  unitCostCents: number;
  basePriceCents: number;
  unitPriceCents: number;
  unitPriceStr: string;
  totalPriceCents: number;
  pricingSummary?: string;
  hasPriceConfigured: boolean;
  notes?: string;
}

interface AppliedDiscountState {
  type: QuoteDiscountType;
  value: number; // Porcentagem numérica ou valor em centavos
  appliedAmountCents: number;
  reason?: string;
  userId?: string;
  userName?: string;
  appliedAt?: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix (Transferência Instantânea)',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro em Espécie',
  bank_slip: 'Boleto Bancário',
  bank_transfer: 'Transferência Bancária (TED/DOC)',
  to_be_defined: 'A Combinar com o Cliente',
};

const PAYMENT_CONDITION_LABELS: Record<PaymentCondition, string> = {
  in_cash: 'À Vista',
  down_payment_and_balance: 'Entrada + Saldo Parcelado',
  installments: 'Parcelado sem Entrada',
  to_be_defined: 'A Combinar',
};

export const NewQuotePage: React.FC<NewQuotePageProps> = ({ onBack, onSuccess }) => {
  const { currentCompany, currentUser, companyUsers } = useTenant();
  const { products, finishings: catalogFinishings, customers, createQuote } = useCommercial();
  const { showNotice } = useNotification();
  const tenantId = currentCompany?.id || 'emp_alphaprint_01';

  // ==========================================
  // 1. DADOS DO CLIENTE
  // ==========================================
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Fechar dropdown de clientes ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRegisteredCustomers = useMemo(() => {
    const activeCustomers = (customers || []).filter(c => c.isActive);
    if (!customerSearchQuery.trim()) return activeCustomers;
    const term = customerSearchQuery.trim().toLowerCase();
    const cleanTerm = term.replace(/\D/g, '');
    return activeCustomers.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(term);
      const corpMatch = (c.corporateName || '').toLowerCase().includes(term);
      const emailMatch = (c.email || '').toLowerCase().includes(term);
      const phoneMatch = (c.phone || '').includes(term) || (c.whatsapp || '').includes(term);
      const docClean = (c.document || '').replace(/\D/g, '');
      const docMatch = (c.document || '').includes(term) || (cleanTerm && docClean.includes(cleanTerm));
      return nameMatch || corpMatch || emailMatch || phoneMatch || Boolean(docMatch);
    });
  }, [customers, customerSearchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerContact(customer.whatsapp || customer.phone || '');
    setCustomerDocument(customer.document || '');
    setCustomerEmail(customer.email || '');
    setIsCustomerDropdownOpen(false);
    setCustomerSearchQuery('');
    showNotice('Cliente Vinculado', `Dados de "${customer.name}" carregados para a proposta.`, 'info');
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId(null);
  };

  // ==========================================
  // 2. ITENS DO ORÇAMENTO E ACABAMENTOS
  // ==========================================
  const [items, setItems] = useState<FormQuoteItem[]>([]);

  // Modal / Gaveta de Seleção de Produto do Catálogo
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [pickerTargetItemId, setPickerTargetItemId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');

  // Prazo de Produção
  const [productionDays, setProductionDays] = useState(
    currentCompany.customization?.defaultProductionDays || 3
  );

  // ==========================================
  // 3. DESCONTO COMERCIAL (COM FLUXO DE APLICAÇÃO EXPLÍCITA)
  // ==========================================
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscountState | null>(null);

  // Inputs do formulário de desconto em digitação
  const [discountTypeInput, setDiscountTypeInput] = useState<QuoteDiscountType>('percentage');
  const [discountValueInput, setDiscountValueInput] = useState('');
  const [discountReasonInput, setDiscountReasonInput] = useState('');
  const [isEditingDiscount, setIsEditingDiscount] = useState(true);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isRemoveDiscountModalOpen, setIsRemoveDiscountModalOpen] = useState(false);

  // Trigger Ref para retorno de foco em modais
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleCloseCatalogPicker = () => {
    setIsCatalogPickerOpen(false);
    setPickerTargetItemId(null);
    triggerRef.current?.focus();
  };

  const handleCloseRemoveDiscountModal = () => {
    setIsRemoveDiscountModalOpen(false);
    triggerRef.current?.focus();
  };

  React.useEffect(() => {
    const isAnyOpen = isCatalogPickerOpen || isRemoveDiscountModalOpen;
    if (!isAnyOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isRemoveDiscountModalOpen) handleCloseRemoveDiscountModal();
        else if (isCatalogPickerOpen) handleCloseCatalogPicker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCatalogPickerOpen, isRemoveDiscountModalOpen]);

  // ==========================================
  // 4. CONDIÇÕES FINANCEIRAS
  // ==========================================
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>('in_cash');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [downPaymentStr, setDownPaymentStr] = useState('');
  const [expectedDownPaymentDate, setExpectedDownPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [installmentIntervalDays, setInstallmentIntervalDays] = useState(30);
  const [financialNotes, setFinancialNotes] = useState('');

  // ==========================================
  // 5. VENDEDOR E COMISSÃO — POLÍTICA ANTI-FORJAMENTO
  // ==========================================
  const isAdministrator = useMemo(() => {
    return (
      currentUser?.role === 'owner' ||
      currentUser?.role === 'admin' ||
      currentUser?.baseProfile === 'admin' ||
      hasUserPermission(currentUser, 'users_permissions', 'edit')
    );
  }, [currentUser]);

  // Lista de usuários ativos da empresa atual (strict tenant isolation)
  // Administradores podem selecionar qualquer vendedor; Membro comum fica vinculado a si mesmo
  const activeSellers = useMemo(() => {
    const orgSellers = companyUsers.filter(u => u.tenantId === currentCompany.id && u.isActive);
    if (isAdministrator) {
      return orgSellers;
    }
    return orgSellers.filter(u => u.id === currentUser?.id);
  }, [companyUsers, currentCompany.id, isAdministrator, currentUser?.id]);

  // Vendedor opcional: inicializa com currentUser se for membro comum, ou null se admin
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(() => {
    return !isAdministrator && currentUser?.id ? currentUser.id : null;
  });
  const [sellerSearchTerm, setSellerSearchTerm] = useState('');
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const sellerDropdownRef = useRef<HTMLDivElement>(null);

  // Campos opcionais de comissão
  const [commissionRatePercentInput, setCommissionRatePercentInput] = useState('');
  const [commissionAmountInput, setCommissionAmountInput] = useState('');

  const selectedSeller = useMemo(() => {
    if (!selectedSellerId) return null;
    return activeSellers.find(u => u.id === selectedSellerId) || null;
  }, [activeSellers, selectedSellerId]);

  // Fecha dropdown do vendedor ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(event.target as Node)) {
        setIsSellerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSellers = useMemo(() => {
    if (!sellerSearchTerm.trim()) return activeSellers;
    const term = sellerSearchTerm.toLowerCase();
    return activeSellers.filter(
      u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.baseProfile && u.baseProfile.toLowerCase().includes(term))
    );
  }, [activeSellers, sellerSearchTerm]);

  // Lista de produtos ativos da gráfica para seleção
  const activeProducts = useMemo(() => {
    return products.filter(p => p.isActive);
  }, [products]);

  // Produtos filtrados no modal de busca do catálogo
  const filteredCatalogProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.shortDescription.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.defaultMaterial.toLowerCase().includes(catalogSearch.toLowerCase());

      const matchCat = catalogCategoryFilter === 'all' || p.category === catalogCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [activeProducts, catalogSearch, catalogCategoryFilter]);

  // Converte acabamentos canônicos compatíveis do catálogo em acabamentos do formulário
  const buildFinishingsForProduct = (product: Product, currentQty: number): FormQuoteItemFinishing[] => {
    // Consulta exclusivamente o catálogo canônico de acabamentos do tenant
    const compatibleCatalogFinishings = catalogFinishings.filter(cf =>
      cf.isActive !== false && isFinishingCompatibleWithProduct(cf, product.id, tenantId)
    );

    return compatibleCatalogFinishings.map(cf => {
      const basis: FinishingPricingBasis = cf.pricingBasis || (cf.pricingMethod as any) || 'PER_UNIT';
      const isReq = Boolean(cf.isRequired);
      const priceCents = cf.priceCents !== undefined ? cf.priceCents : (cf.costPriceCents || 0);

      let priceStatus: FinishingPriceStatus =
        cf.priceStatus || (priceCents > 0 ? 'CONFIGURED' : isReq ? 'FREE' : 'NOT_CONFIGURED');

      const isConfiguredOrFree = priceStatus === 'FREE' || (priceStatus === 'CONFIGURED' && priceCents > 0);
      const isSelected = isReq ? true : (Boolean(cf.isDefaultSelected) && isConfiguredOrFree);

      return {
        finishingId: cf.id,
        name: cf.name,
        description: cf.description,
        pricingBasis: basis,
        unitPriceCents: priceCents,
        totalPriceCents: 0,
        priceStatus,
        isRequired: isReq,
        isOptional: !isReq,
        isAdditional: false,
        selected: isSelected,
        quantity: currentQty,
        notes: '',
        hasPriceConfigured: isConfiguredOrFree,
      };
    });
  };

  const recalculateFormQuoteItem = (item: FormQuoteItem): FormQuoteItem => {
    const activeFinishings = (item.finishings || [])
      .filter(f => f.selected)
      .map(f => ({
        finishingId: f.finishingId,
        name: f.name,
        pricingBasis: f.pricingBasis,
        unitPriceCents: f.unitPriceCents,
        priceStatus: f.priceStatus,
        isRequired: f.isRequired,
        isOptional: f.isOptional,
      }));

    const pricingRes = calculateItemPricing({
      pricingMode: item.pricingMode || 'UNIT',
      salePriceCents: item.basePriceCents,
      quantity: item.quantity,
      lotSize: item.lotSize,
      widthMm: item.widthMm,
      heightMm: item.heightMm,
      lengthMeters: item.lengthMeters,
      finishings: activeFinishings,
    });

    const updatedFinishings = (item.finishings || []).map(f => {
      if (!f.selected) {
        return { ...f, totalPriceCents: 0, calculationMemory: undefined };
      }
      const calcFin = pricingRes.calculatedFinishings.find(
        cf => cf.finishingId === f.finishingId || cf.name.toLowerCase() === f.name.toLowerCase()
      );
      return {
        ...f,
        totalPriceCents: calcFin ? calcFin.totalPriceCents : 0,
        calculationMemory: calcFin?.calculationMemory,
      };
    });

    return {
      ...item,
      pricingMode: pricingRes.pricingMode,
      lotSize: pricingRes.lotSize,
      billedQuantity: pricingRes.billedQuantity,
      areaM2: pricingRes.areaM2,
      linearMeters: pricingRes.linearMeters,
      basePriceCents: pricingRes.basePriceCents,
      unitPriceCents: pricingRes.unitPriceEquivalentCents,
      unitPriceStr: (pricingRes.basePriceCents / 100).toFixed(2).replace('.', ','),
      totalPriceCents: pricingRes.totalItemCents,
      finishings: updatedFinishings,
      pricingSummary: pricingRes.pricingSummary,
      hasPriceConfigured: pricingRes.basePriceCents > 0,
    };
  };

  const createItemFromProduct = (product: Product): FormQuoteItem => {
    const mode = product.pricingMode || inferPricingMode(product);
    const qty = product.defaultQuantity || (mode === 'LOT' ? 1000 : 1);
    const finishings = buildFinishingsForProduct(product, qty);

    let defaultLengthM: number | undefined;
    if (mode === 'LINEAR_METER') {
      defaultLengthM = product.defaultWidthMm ? product.defaultWidthMm / 1000 : 1;
    }

    const initialItem: FormQuoteItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      isCustom: false,
      productName: product.name,
      category: product.category,
      pricingMode: mode,
      lotSize: product.lotSize || (mode === 'LOT' ? 1000 : undefined),
      calculationUnit: product.calculationUnit,
      quantity: qty,
      widthMm: product.defaultWidthMm,
      heightMm: product.defaultHeightMm,
      lengthMeters: defaultLengthM,
      materialName: product.defaultMaterial || '',
      availableMaterials: product.availableMaterials || (product.defaultMaterial ? [product.defaultMaterial] : []),
      finishings,
      unitCostCents: product.baseCostCents,
      basePriceCents: product.salePriceCents,
      unitPriceCents: product.salePriceCents,
      unitPriceStr: (product.salePriceCents / 100).toFixed(2).replace('.', ','),
      totalPriceCents: 0,
      hasPriceConfigured: product.hasPriceConfigured,
      notes: '',
    };

    return recalculateFormQuoteItem(initialItem);
  };

  // Inicializa o primeiro item com o primeiro produto ativo do catálogo ou personalizado
  useEffect(() => {
    if (items.length === 0) {
      if (activeProducts.length > 0) {
        setItems([createItemFromProduct(activeProducts[0])]);
      } else {
        handleAddCustomItem();
      }
    }
  }, [activeProducts]);

  // Adicionar item a partir do catálogo (abre picker)
  const handleOpenCatalogPicker = (targetItemId?: string) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setPickerTargetItemId(targetItemId || null);
    setCatalogSearch('');
    setCatalogCategoryFilter('all');
    setIsCatalogPickerOpen(true);
  };

  // Adicionar Item Personalizado / Avulso
  const handleAddCustomItem = () => {
    const newItem: FormQuoteItem = {
      id: `it_custom_${Date.now()}`,
      isCustom: true,
      productName: '',
      pricingMode: 'UNIT',
      lotSize: 1000,
      calculationUnit: 'unit',
      quantity: 1,
      materialName: '',
      availableMaterials: [],
      finishings: [],
      unitCostCents: 0,
      basePriceCents: 0,
      unitPriceCents: 0,
      unitPriceStr: '0,00',
      totalPriceCents: 0,
      hasPriceConfigured: false,
      notes: '',
    };
    setItems(prev => [...prev, newItem]);
  };

  // Selecionar produto no picker
  const handleSelectProductFromCatalog = (product: Product) => {
    const newItem = createItemFromProduct(product);

    if (pickerTargetItemId) {
      setItems(prev =>
        prev.map(it => {
          if (it.id === pickerTargetItemId) {
            return {
              ...newItem,
              notes: it.notes || newItem.notes,
            };
          }
          return it;
        })
      );
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setIsCatalogPickerOpen(false);
    setPickerTargetItemId(null);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      showNotice('Item Mínimo', 'O orçamento precisa ter pelo menos um item.', 'warning');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Alternar acabamento selecionado
  const handleToggleFinishing = (itemId: string, finishingName: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;

        const updatedFinishings = it.finishings.map(fin => {
          if (fin.name === finishingName) {
            if (fin.isRequired) {
              showNotice(
                'Acabamento Obrigatório',
                `O acabamento "${fin.name}" é requisito técnico de produção deste item e já está incluso sem custo adicional.`,
                'info'
              );
              return fin;
            }

            if (!fin.selected && (fin.priceStatus === 'NOT_CONFIGURED' || (!fin.priceStatus && fin.unitPriceCents === 0))) {
              showNotice(
                'Preço Não Configurado',
                `O acabamento "${fin.name}" não possui preço de venda configurado no catálogo. Configure o valor no Catálogo de Acabamentos para cobrá-lo na proposta.`,
                'warning'
              );
              return fin;
            }

            return { ...fin, selected: !fin.selected };
          }
          return fin;
        });

        return recalculateFormQuoteItem({ ...it, finishings: updatedFinishings });
      })
    );
  };

  // Adicionar acabamento avulso do catálogo a um item
  const handleAddFinishingToItem = (itemId: string, finishing: Finishing) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;

        if (it.finishings.some(f => f.name.toLowerCase() === finishing.name.toLowerCase())) {
          showNotice('Acabamento Existente', `O acabamento "${finishing.name}" já está na lista deste item.`, 'info');
          return it;
        }

        // Bloqueio de acabamento incompatível com o produto do item
        if (it.productId && !isFinishingCompatibleWithProduct(finishing, it.productId, tenantId)) {
          showNotice(
            'Acabamento Incompatível',
            `O acabamento "${finishing.name}" não é compatível com o produto "${it.productName}".`,
            'warning'
          );
          return it;
        }

        const basis: FinishingPricingBasis = finishing.pricingBasis || (finishing.pricingMethod as any) || 'PER_UNIT';
        const priceCents = finishing.priceCents !== undefined ? finishing.priceCents : (finishing.costPriceCents || 0);
        const priceStatus: FinishingPriceStatus = finishing.priceStatus || (priceCents > 0 ? 'CONFIGURED' : finishing.isRequired ? 'FREE' : 'NOT_CONFIGURED');

        const isConfiguredOrFree = priceStatus === 'FREE' || (priceStatus === 'CONFIGURED' && priceCents > 0);

        if (!isConfiguredOrFree) {
          showNotice(
            'Preço Não Configurado',
            `O acabamento "${finishing.name}" está sem preço configurado no catálogo. Configure o valor no Catálogo antes de adicioná-lo à proposta comercial.`,
            'warning'
          );
          return it;
        }

        const newFin: FormQuoteItemFinishing = {
          finishingId: finishing.id,
          name: finishing.name,
          description: finishing.description,
          pricingBasis: basis,
          unitPriceCents: priceCents,
          totalPriceCents: 0,
          priceStatus,
          isRequired: false,
          isOptional: true,
          isAdditional: true,
          selected: true,
          quantity: it.quantity,
          hasPriceConfigured: true,
        };

        return recalculateFormQuoteItem({ ...it, finishings: [...it.finishings, newFin] });
      })
    );
  };

  // Atualiza campo do item e recalcula automaticamente valores
  const handleUpdateItem = (id: string, field: keyof FormQuoteItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === 'unitPriceStr') {
          const parsedCents = parseBRLToCents(value);
          updated.basePriceCents = parsedCents;
          updated.unitPriceStr = value;
        } else if (field === 'quantity') {
          updated.quantity = Math.max(1, parseInt(value, 10) || 1);
        } else if (field === 'widthMm') {
          updated.widthMm = value !== '' ? Number(value) : undefined;
        } else if (field === 'heightMm') {
          updated.heightMm = value !== '' ? Number(value) : undefined;
        } else if (field === 'lengthMeters') {
          updated.lengthMeters = value !== '' ? Number(value) : undefined;
        } else if (field === 'lotSize') {
          updated.lotSize = Math.max(1, parseInt(value, 10) || 1000);
        } else if (field === 'pricingMode') {
          updated.pricingMode = value as PricingMode;
          if (value === 'LOT' && !updated.lotSize) {
            updated.lotSize = 1000;
          }
        }

        return recalculateFormQuoteItem(updated);
      })
    );
  };

  // Subtotal da Proposta
  const subtotalCents = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.totalPriceCents || 0), 0);
  }, [items]);

  // Desconto Efetivamente Aplicado
  const appliedDiscountCents = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percentage') {
      const calculated = Math.round((subtotalCents * appliedDiscount.value) / 100);
      return Math.min(subtotalCents, calculated);
    }
    if (appliedDiscount.type === 'fixed') {
      return Math.min(subtotalCents, appliedDiscount.value);
    }
    return 0;
  }, [appliedDiscount, subtotalCents]);

  // Total Final Oficial da Proposta
  const totalFinalCents = Math.max(0, subtotalCents - appliedDiscountCents);

  // Prévia em tempo real do formulário de desconto enquanto o usuário digita
  const discountDraftPreview = useMemo(() => {
    if (discountTypeInput === 'none') {
      return { discountCents: 0, previewTotalCents: subtotalCents, valid: true };
    }
    if (discountTypeInput === 'percentage') {
      const val = parseFloat(discountValueInput.replace(',', '.')) || 0;
      if (val <= 0) return { discountCents: 0, previewTotalCents: subtotalCents, valid: false };
      if (val > 100) return { discountCents: 0, previewTotalCents: subtotalCents, valid: false, error: 'Máximo 100%' };
      const calc = Math.round((subtotalCents * val) / 100);
      return {
        discountCents: calc,
        previewTotalCents: Math.max(0, subtotalCents - calc),
        valid: true,
      };
    }
    if (discountTypeInput === 'fixed') {
      const cents = parseBRLToCents(discountValueInput);
      if (cents <= 0) return { discountCents: 0, previewTotalCents: subtotalCents, valid: false };
      if (cents > subtotalCents) {
        return {
          discountCents: cents,
          previewTotalCents: 0,
          valid: false,
          error: 'Maior que o subtotal',
        };
      }
      return {
        discountCents: cents,
        previewTotalCents: Math.max(0, subtotalCents - cents),
        valid: true,
      };
    }
    return { discountCents: 0, previewTotalCents: subtotalCents, valid: true };
  }, [discountTypeInput, discountValueInput, subtotalCents]);

  // Ação de Aplicar Desconto (Validação Estrita)
  const handleApplyDiscount = () => {
    setDiscountError(null);

    if (discountTypeInput === 'none') {
      setAppliedDiscount(null);
      setIsEditingDiscount(false);
      showNotice('Desconto', 'Nenhum desconto aplicado à proposta.', 'info');
      return;
    }

    if (discountTypeInput === 'percentage') {
      const percent = parseFloat(discountValueInput.replace(',', '.'));
      if (isNaN(percent) || percent <= 0) {
        setDiscountError('Informe uma porcentagem de desconto válida e maior que zero.');
        return;
      }
      if (percent > 100) {
        setDiscountError('A porcentagem de desconto não pode ultrapassar 100%.');
        return;
      }

      const calculatedCents = Math.round((subtotalCents * percent) / 100);
      setAppliedDiscount({
        type: 'percentage',
        value: percent,
        appliedAmountCents: calculatedCents,
        reason: discountReasonInput.trim() || undefined,
        userId: currentUser.id,
        userName: currentUser.name,
        appliedAt: new Date().toISOString(),
      });
      setIsEditingDiscount(false);
      showNotice(
        'Desconto Aplicado',
        `Desconto de ${percent}% (${formatCentsToBRL(calculatedCents)}) aplicado com sucesso.`,
        'success'
      );
      return;
    }

    if (discountTypeInput === 'fixed') {
      const fixedCents = parseBRLToCents(discountValueInput);
      if (fixedCents <= 0) {
        setDiscountError('Informe um valor de desconto válido e maior que zero.');
        return;
      }
      if (fixedCents > subtotalCents) {
        setDiscountError(
          `O desconto (${formatCentsToBRL(fixedCents)}) não pode ser superior ao subtotal da proposta (${formatCentsToBRL(subtotalCents)}).`
        );
        return;
      }

      setAppliedDiscount({
        type: 'fixed',
        value: fixedCents,
        appliedAmountCents: fixedCents,
        reason: discountReasonInput.trim() || undefined,
        userId: currentUser.id,
        userName: currentUser.name,
        appliedAt: new Date().toISOString(),
      });
      setIsEditingDiscount(false);
      showNotice(
        'Desconto Aplicado',
        `Desconto de ${formatCentsToBRL(fixedCents)} aplicado com sucesso.`,
        'success'
      );
    }
  };

  // Abrir edição de desconto
  const handleStartEditDiscount = () => {
    if (appliedDiscount) {
      setDiscountTypeInput(appliedDiscount.type);
      setDiscountValueInput(
        appliedDiscount.type === 'percentage'
          ? String(appliedDiscount.value).replace('.', ',')
          : (appliedDiscount.value / 100).toFixed(2).replace('.', ',')
      );
      setDiscountReasonInput(appliedDiscount.reason || '');
    }
    setDiscountError(null);
    setIsEditingDiscount(true);
  };

  // Confirmar remoção de desconto
  const handleConfirmRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountTypeInput('percentage');
    setDiscountValueInput('');
    setDiscountReasonInput('');
    setIsEditingDiscount(true);
    handleCloseRemoveDiscountModal();
    setDiscountError(null);
    showNotice('Desconto Removido', 'O desconto comercial foi removido e o total original restaurado.', 'info');
  };

  const downPaymentCents = useMemo(() => {
    if (paymentCondition !== 'down_payment_and_balance') return 0;
    return Math.min(totalFinalCents, parseBRLToCents(downPaymentStr));
  }, [paymentCondition, downPaymentStr, totalFinalCents]);

  // Parcelas Calculadas
  const calculatedInstallments = useMemo(() => {
    return calculateInstallments(
      totalFinalCents,
      paymentCondition,
      installmentsCount,
      downPaymentCents,
      installmentIntervalDays,
      expectedDownPaymentDate
    );
  }, [
    totalFinalCents,
    paymentCondition,
    installmentsCount,
    downPaymentCents,
    installmentIntervalDays,
    expectedDownPaymentDate,
  ]);

  const getProfileLabel = (profile?: string, role?: string): string => {
    const p = profile || role || 'sales';
    switch (p) {
      case 'admin':
      case 'owner':
        return 'Administrador / Gestor';
      case 'sales':
        return 'Comercial / Vendas';
      case 'reception':
        return 'Recepção / Atendimento';
      case 'production':
        return 'Produção / PCP';
      default:
        return 'Atendimento';
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'V';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showNotice('Campo Obrigatório', 'Informe o nome do cliente.', 'warning');
      return;
    }

    if (items.length === 0) {
      showNotice('Itens Ausentes', 'Adicione pelo menos um item ao orçamento.', 'warning');
      return;
    }

    const unpricedItem = items.find(it => it.totalPriceCents <= 0 || it.unitPriceCents <= 0);
    if (unpricedItem) {
      showNotice(
        'Item Sem Preço',
        `O item "${unpricedItem.productName || 'Personalizado'}" está sem preço definido. Informe o valor unitário manualmente para prosseguir.`,
        'warning'
      );
      return;
    }

    // Validações estritas por modalidade de precificação e acabamentos
    for (const it of items) {
      if (!it.productName.trim()) {
        showNotice('Item Incompleto', 'Preencha a descrição de todos os itens.', 'warning');
        return;
      }
      if (!it.quantity || it.quantity <= 0 || isNaN(it.quantity)) {
        showNotice('Quantidade Inválida', `Informe uma quantidade válida e maior que zero para "${it.productName}".`, 'warning');
        return;
      }
      if (it.pricingMode === 'LOT' && (!it.lotSize || it.lotSize <= 0)) {
        showNotice('Lote Inválido', `O tamanho do lote para "${it.productName}" deve ser maior que zero.`, 'warning');
        return;
      }
      if (it.pricingMode === 'SQUARE_METER') {
        if (!it.widthMm || it.widthMm <= 0 || !it.heightMm || it.heightMm <= 0) {
          showNotice('Dimensões Inválidas', `Informe largura e altura válidas (maiores que zero) para "${it.productName}".`, 'warning');
          return;
        }
      }
      if (it.pricingMode === 'LINEAR_METER') {
        const len = it.lengthMeters || (it.widthMm ? it.widthMm / 1000 : 0);
        if (len <= 0) {
          showNotice('Comprimento Inválido', `Informe um comprimento válido para "${it.productName}".`, 'warning');
          return;
        }
      }

      // Bloqueio de acabamento selecionado sem preço configurado
      const unconfiguredSelectedFin = it.finishings.find(f => f.selected && f.priceStatus === 'NOT_CONFIGURED');
      if (unconfiguredSelectedFin) {
        showNotice(
          'Acabamento Sem Preço',
          `O acabamento "${unconfiguredSelectedFin.name}" no item "${it.productName}" está com preço não configurado. Desmarque-o ou configure seu valor no catálogo antes de salvar.`,
          'warning'
        );
        return;
      }

      // Bloqueio de acabamento incompatível com o produto do item
      if (it.productId) {
        for (const f of it.finishings.filter(fin => fin.selected)) {
          const catalogFin = catalogFinishings.find(cf => cf.id === f.finishingId || cf.name.toLowerCase() === f.name.toLowerCase());
          if (catalogFin && !isFinishingCompatibleWithProduct(catalogFin, it.productId, tenantId) && !f.isRequired) {
            showNotice(
              'Acabamento Incompatível',
              `O acabamento "${f.name}" no item "${it.productName}" não é compatível com este produto. Revise os acabamentos antes de salvar.`,
              'warning'
            );
            return;
          }
        }
      }
    }

    // Converte os itens e acabamentos selecionados de cada item preservando o snapshot
    const formattedItems = items.map(it => {
      const selectedFinishings: QuoteItemFinishing[] = it.finishings
        .filter(f => f.selected)
        .map(f => ({
          finishingId: f.finishingId,
          name: f.name,
          pricingBasis: f.pricingBasis,
          unitPriceCents: f.unitPriceCents || 0,
          totalPriceCents: f.totalPriceCents || 0,
          priceStatus: f.priceStatus,
          calculationMemory: f.calculationMemory,
          isRequired: f.isRequired,
          isOptional: f.isOptional,
          quantity: it.quantity,
          notes: f.notes,
        }));

      return {
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        pricingMode: it.pricingMode,
        quantity: it.quantity,
        lotSize: it.lotSize,
        billedQuantity: it.billedQuantity,
        widthMm: it.widthMm,
        heightMm: it.heightMm,
        lengthMeters: it.lengthMeters,
        areaM2: it.areaM2,
        linearMeters: it.linearMeters,
        basePriceCents: it.basePriceCents,
        materialName: it.materialName,
        finishings: selectedFinishings,
        unitCostCents: it.unitCostCents || 0,
        unitPriceCents: it.unitPriceCents,
        totalPriceCents: it.totalPriceCents,
        pricingSummary: it.pricingSummary,
        notes: it.notes,
      };
    });

    const parsedCommissionRate = commissionRatePercentInput.trim()
      ? parseFloat(commissionRatePercentInput.replace(',', '.')) || null
      : null;
    const parsedCommissionAmount = commissionAmountInput.trim()
      ? parseBRLToCents(commissionAmountInput)
      : null;

    createQuote({
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerContact: customerContact.trim() || undefined,
      customerDocument: customerDocument.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      sellerId: isAdministrator ? (selectedSeller ? selectedSeller.id : null) : (currentUser?.id || null),
      sellerName: isAdministrator ? (selectedSeller ? selectedSeller.name : null) : (currentUser?.name || null),
      salespersonId: isAdministrator ? (selectedSeller ? selectedSeller.id : null) : (currentUser?.id || null),
      salespersonName: isAdministrator ? (selectedSeller ? selectedSeller.name : null) : (currentUser?.name || null),
      commissionRatePercent: parsedCommissionRate,
      commissionAmountCents: parsedCommissionAmount,
      items: formattedItems,
      subtotalCents,
      discount: appliedDiscount
        ? {
            type: appliedDiscount.type,
            value: appliedDiscount.value,
            appliedAmountCents: appliedDiscountCents,
            reason: appliedDiscount.reason,
            userId: appliedDiscount.userId || currentUser.id,
            userName: appliedDiscount.userName || currentUser.name,
            appliedAt: appliedDiscount.appliedAt,
          }
        : {
            type: 'none',
            value: 0,
            appliedAmountCents: 0,
          },
      totalCents: totalFinalCents,
      estimatedProductionDays: productionDays,
      paymentTerms: `${PAYMENT_CONDITION_LABELS[paymentCondition]} via ${PAYMENT_METHOD_LABELS[paymentMethod]}`,
      financialTerms: {
        paymentMethod,
        paymentCondition,
        installmentsCount: paymentCondition === 'in_cash' ? 1 : installmentsCount,
        downPaymentCents,
        expectedDownPaymentDate,
        installmentIntervalDays,
        financialNotes,
        installments: calculatedInstallments,
      },
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Novo Orçamento</h1>
            <p className="text-sm text-slate-500">
              Elaboração de proposta comercial com catálogo oficial, acabamentos técnicos e precificação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onBack}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
            Salvar Orçamento
          </Button>
        </div>
      </div>

      {/* 1. Identificação do Cliente */}
      <Card className="p-6 space-y-4 bg-white border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <UserIcon className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              1. Dados do Cliente
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Campos marcados com * são obrigatórios
          </span>
        </div>

        {/* Barra de Busca / Seleção de Cliente Cadastrado */}
        <div className="relative" ref={customerSearchRef}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={customerSearchQuery}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={e => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                placeholder="Buscar cliente cadastrado por nome, documento, e-mail ou telefone..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl outline-none transition-all shadow-2xs"
              />
            </div>

            {selectedCustomerId && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cliente vinculado da base</span>
                <button
                  type="button"
                  onClick={handleClearSelectedCustomer}
                  className="ml-1 p-0.5 hover:bg-emerald-200/60 rounded text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  title="Desvincular e manter dados editáveis"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Dropdown de Clientes Encontrados */}
          {isCustomerDropdownOpen && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
              <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between items-center">
                <span>Clientes Cadastrados Ativos ({filteredRegisteredCustomers.length})</span>
                <span className="text-[10px] text-slate-400">Clique para auto-preencher</span>
              </div>

              {filteredRegisteredCustomers.length > 0 ? (
                filteredRegisteredCustomers.map(cust => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelectCustomer(cust)}
                    className="w-full text-left p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                        {cust.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {cust.document ? `Doc: ${cust.document}` : 'Sem documento'} • {cust.phone || cust.whatsapp || cust.email || 'Sem contato'}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                      {cust.type === 'company' ? 'PJ' : 'PF'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhum cliente cadastrado com este termo. Você pode preencher os campos abaixo normalmente para cliente avulso.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <Input
            label="Nome do Cliente / Razão Social *"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Ex: Studio Beleza & Estética"
            required
          />
          <Input
            label="WhatsApp / Telefone de Contato"
            value={customerContact}
            onChange={e => setCustomerContact(e.target.value)}
            placeholder="(11) 98888-7777"
          />
          <Input
            label="CPF / CNPJ"
            value={customerDocument}
            onChange={e => setCustomerDocument(e.target.value)}
            placeholder="00.000.000/0001-00"
          />
          <Input
            label="E-mail de Contato"
            type="email"
            value={customerEmail}
            onChange={e => setCustomerEmail(e.target.value)}
            placeholder="contato@cliente.com.br"
          />
        </div>

        <p className="text-[11px] text-slate-400">
          Nota: Os dados acima formam o snapshot específico desta proposta comercial e não alteram o cadastro original.
        </p>
      </Card>

      {/* 2. Itens do Orçamento e Acabamentos */}
      <Card className="p-6 space-y-4 bg-white border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Itens da Proposta Gráfica ({items.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Package className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => handleOpenCatalogPicker()}
            >
              + Adicionar do Catálogo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddCustomItem}
            >
              Item Avulso
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const mode = item.pricingMode || 'UNIT';

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200/90 space-y-4 transition-all hover:border-slate-300"
              >
                {/* Linha 1: Cabeçalho do Item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      {item.isCustom ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={e => handleUpdateItem(item.id, 'productName', e.target.value)}
                            placeholder="Descrição do produto gráfico personalizado..."
                            className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-none pb-0.5 min-w-[200px]"
                          />
                          <select
                            value={mode}
                            onChange={e => handleUpdateItem(item.id, 'pricingMode', e.target.value)}
                            className="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            <option value="UNIT">Por Unidade</option>
                            <option value="LOT">Por Lote / Tiragem</option>
                            <option value="SQUARE_METER">Por Metro Quadrado (m²)</option>
                            <option value="LINEAR_METER">Por Metro Linear</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {item.productName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            {mode === 'LOT'
                              ? `Lote de ${new Intl.NumberFormat('pt-BR').format(item.lotSize || 1000)} un.`
                              : mode === 'SQUARE_METER'
                              ? 'Metro Quadrado (m²)'
                              : mode === 'LINEAR_METER'
                              ? 'Metro Linear'
                              : 'Por Unidade'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCatalogPicker(item.id)}
                            className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold underline cursor-pointer"
                          >
                            Trocar produto
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Total do Item
                      </div>
                      <div className="text-base font-black text-slate-900 font-mono">
                        {formatCentsToBRL(item.totalPriceCents)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remover este item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Linha 2: Especificações Técnicas e Preço Dinâmicos por Modalidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Campo 1: Quantidade Solicitada */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      {mode === 'LOT' ? 'Qtd. Solicitada (un.) *' : mode === 'UNIT' ? 'Quantidade (un.) *' : 'Quantidade (peças) *'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Campos Específicos por Modalidade */}
                  {mode === 'LOT' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Tamanho do Lote (un.) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.lotSize || 1000}
                        onChange={e => handleUpdateItem(item.id, 'lotSize', e.target.value)}
                        placeholder="1000"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {mode === 'SQUARE_METER' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Largura (mm) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.widthMm || ''}
                          onChange={e => handleUpdateItem(item.id, 'widthMm', e.target.value)}
                          placeholder="Ex: 1000"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Altura (mm) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.heightMm || ''}
                          onChange={e => handleUpdateItem(item.id, 'heightMm', e.target.value)}
                          placeholder="Ex: 1500"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  {mode === 'LINEAR_METER' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Comprimento da Peça (m) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.lengthMeters !== undefined ? item.lengthMeters : (item.widthMm ? item.widthMm / 1000 : 1)}
                        onChange={e => handleUpdateItem(item.id, 'lengthMeters', e.target.value)}
                        placeholder="Ex: 3.00"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {/* Substrato / Papel */}
                  <div className={mode === 'LOT' || mode === 'LINEAR_METER' ? 'lg:col-span-2' : mode === 'UNIT' ? 'lg:col-span-3' : 'lg:col-span-1'}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Substrato / Insumo
                    </label>
                    {item.availableMaterials && item.availableMaterials.length > 1 ? (
                      <select
                        value={item.materialName}
                        onChange={e => handleUpdateItem(item.id, 'materialName', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {item.availableMaterials.map(mat => (
                          <option key={mat} value={mat}>
                            {mat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={item.materialName}
                        onChange={e => handleUpdateItem(item.id, 'materialName', e.target.value)}
                        placeholder="Ex: Papel Couché 300g, Lona Frontlight..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>

                  {/* Preço Base com Rótulo Neutro e Contextualizado */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      {mode === 'LOT'
                        ? `Preço / Lote (${new Intl.NumberFormat('pt-BR').format(item.lotSize || 1000)} un.)`
                        : mode === 'SQUARE_METER'
                        ? 'Preço / m² (R$)'
                        : mode === 'LINEAR_METER'
                        ? 'Preço / m Linear (R$)'
                        : 'Preço / Unidade (R$)'}
                    </label>
                    <input
                      type="text"
                      value={item.unitPriceStr}
                      onChange={e => handleUpdateItem(item.id, 'unitPriceStr', e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Banner de Demonstração de Cálculo da Modalidade */}
                {item.pricingSummary && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{item.pricingSummary}</span>
                    </div>
                    {mode === 'LOT' && item.quantity % (item.lotSize || 1000) !== 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                        {item.billedQuantity} lotes cobrados
                      </span>
                    )}
                  </div>
                )}

                {/* Linha 3: Acabamentos do Item (Obrigatórios, Opcionais e Memória de Cálculo) */}
                <div className="pt-2 border-t border-slate-200/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acabamentos Técnicos do Item</span>
                    </div>

                    {catalogFinishings.length > 0 && (
                      <div className="flex items-center gap-1">
                        <select
                          className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-pointer outline-none hover:bg-slate-100"
                          defaultValue=""
                          onChange={e => {
                            if (!e.target.value) return;
                            const fin = catalogFinishings.find(f => f.id === e.target.value);
                            if (fin) handleAddFinishingToItem(item.id, fin);
                            e.target.value = '';
                          }}
                        >
                          <option value="" disabled>
                            + Adicionar acabamento adicional...
                          </option>
                          {catalogFinishings
                            .filter(
                              cf =>
                                cf.isActive &&
                                (!item.productId || isFinishingCompatibleWithProduct(cf, item.productId, tenantId)) &&
                                !item.finishings.some(
                                  f => f.name.toLowerCase() === cf.name.toLowerCase()
                                )
                            )
                            .map(cf => (
                              <option key={cf.id} value={cf.id}>
                                {cf.name} {cf.priceStatus === 'FREE' ? '(Incluso)' : cf.priceStatus === 'NOT_CONFIGURED' ? '(Sem preço)' : `(${formatCentsToBRL(cf.priceCents || cf.costPriceCents || 0)})`}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {item.finishings.length === 0 ? (
                    <div className="text-xs text-slate-400 py-1">
                      Nenhum acabamento vinculado ou selecionado para este produto.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Acabamentos Obrigatórios */}
                      {item.finishings.filter(f => f.isRequired).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Acabamentos Obrigatórios do Produto
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.finishings
                              .filter(f => f.isRequired)
                              .map(fin => (
                                <div
                                  key={fin.name}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50/90 text-emerald-800 border border-emerald-200 select-none"
                                >
                                  <Lock className="w-3 h-3 text-emerald-600" />
                                  <span>{fin.name}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase border border-emerald-200/60">
                                    Obrigatório • Incluso sem custo
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Acabamentos Opcionais / Adicionais */}
                      {item.finishings.filter(f => !f.isRequired).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Acabamentos Opcionais & Adicionais
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.finishings
                              .filter(f => !f.isRequired)
                              .map(fin => {
                                const isNotConfigured =
                                  fin.priceStatus === 'NOT_CONFIGURED' ||
                                  (!fin.priceStatus && fin.unitPriceCents === 0);

                                const basis = fin.pricingBasis || 'PER_UNIT';
                                const basisTag =
                                  basis === 'FIXED'
                                    ? 'fixo'
                                    : basis === 'PER_LOT'
                                    ? 'lote'
                                    : basis === 'PER_SQUARE_METER'
                                    ? 'm²'
                                    : basis === 'PER_LINEAR_METER'
                                    ? 'm'
                                    : 'un.';

                                if (isNotConfigured) {
                                  return (
                                    <div
                                      key={fin.name}
                                      onClick={() => handleToggleFinishing(item.id, fin.name)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50/70 text-amber-900 border border-amber-200/80 cursor-not-allowed opacity-80 select-none"
                                      title="Acabamento sem preço configurado no catálogo. Não pode ser adicionado como R$ 0,00."
                                    >
                                      <span className="w-3.5 h-3.5 rounded border border-amber-300 bg-amber-100/50 flex items-center justify-center text-[10px] font-bold text-amber-700">
                                        !
                                      </span>
                                      <span>{fin.name}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                                        Preço não configurado
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={fin.name}
                                    onClick={() => handleToggleFinishing(item.id, fin.name)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none ${
                                      fin.selected
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={fin.selected}
                                      onChange={() => {}}
                                      className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 pointer-events-none"
                                    />
                                    <span>{fin.name}</span>
                                    {fin.priceStatus === 'FREE' ? (
                                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded font-medium">
                                        Incluso
                                      </span>
                                    ) : (
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${fin.selected ? 'bg-emerald-100/80 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
                                        {fin.selected
                                          ? `+ ${formatCentsToBRL(fin.totalPriceCents)}`
                                          : `+ ${formatCentsToBRL(fin.unitPriceCents)}/${basisTag}`}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Memória de Cálculo dos Acabamentos Selecionados */}
                      {item.finishings.some(f => f.selected && f.totalPriceCents > 0) && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="font-bold text-[11px] uppercase tracking-wider text-slate-600">
                            Memória de Cálculo dos Acabamentos Cobrados
                          </div>
                          <div className="space-y-0.5">
                            {item.finishings
                              .filter(f => f.selected && f.totalPriceCents > 0)
                              .map(f => (
                                <div key={f.name} className="flex justify-between items-center text-slate-700 font-mono text-[11px]">
                                  <span>{f.name}: {f.calculationMemory}</span>
                                  <span className="font-bold text-slate-900">{formatCentsToBRL(f.totalPriceCents)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Linha 4: Observações Técnicas */}
                <div>
                  <Input
                    label="Observações Técnicas / Instruções do Item"
                    value={item.notes || ''}
                    onChange={e => handleUpdateItem(item.id, 'notes', e.target.value)}
                    placeholder="Instruções de corte, dobra, conferência de sangria ou aplicação especial..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Desconto Comercial & Resumo Financeiro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seção Desconto Comercial com Botão de Aplicação Explícita */}
        <Card className="lg:col-span-2 p-6 space-y-5 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-800">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Desconto Comercial</h2>
            </div>
            {appliedDiscount && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Desconto Aplicado
              </span>
            )}
          </div>

          {/* Exibição do Desconto Aplicado (Quando não estiver editando) */}
          {appliedDiscount && !isEditingDiscount ? (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    {appliedDiscount.type === 'percentage'
                      ? `Desconto de ${appliedDiscount.value}%`
                      : `Desconto de Valor Fixo`}
                  </span>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                    -{formatCentsToBRL(appliedDiscountCents)}
                  </div>
                  {appliedDiscount.reason && (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      Motivo: "{appliedDiscount.reason}"
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aplicado por {appliedDiscount.userName || currentUser.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5 text-emerald-600" />}
                    onClick={handleStartEditDiscount}
                  >
                    Editar desconto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      triggerRef.current = e.currentTarget;
                      setIsRemoveDiscountModalOpen(true);
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Formulário de Configuração e Aplicação de Desconto */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Tipo de Desconto
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none' as const, label: 'Sem Desconto' },
                    { id: 'percentage' as const, label: 'Porcentagem (%)' },
                    { id: 'fixed' as const, label: 'Valor Fixo (R$)' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setDiscountTypeInput(type.id);
                        if (type.id === 'none') {
                          setDiscountValueInput('');
                        }
                        setDiscountError(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        discountTypeInput === type.id
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {discountTypeInput !== 'none' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={
                        discountTypeInput === 'percentage'
                          ? 'Porcentagem de Desconto (%) *'
                          : 'Valor do Desconto (R$) *'
                      }
                      value={discountValueInput}
                      onChange={e => {
                        setDiscountValueInput(e.target.value);
                        setDiscountError(null);
                      }}
                      placeholder={discountTypeInput === 'percentage' ? 'Ex: 10' : 'Ex: 25,00'}
                      required
                    />
                    <Input
                      label="Motivo Comercial do Desconto (Opcional)"
                      value={discountReasonInput}
                      onChange={e => setDiscountReasonInput(e.target.value)}
                      placeholder="Ex: Parceria comercial, volume de tiragem..."
                    />
                  </div>

                  {/* Mensagem de Erro de Validação */}
                  {discountError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{discountError}</span>
                    </div>
                  )}

                  {/* Prévia em Tempo Real enquanto digita (Não altera o total até clicar em Aplicar) */}
                  {discountValueInput.trim() !== '' && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-slate-600">
                        <span className="font-semibold text-slate-800">Prévia do cálculo: </span>
                        <span className="font-mono text-emerald-700 font-bold">
                          -{formatCentsToBRL(discountDraftPreview.discountCents)}
                        </span>
                        {' • '}
                        <span>Total previsto: </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCentsToBRL(discountDraftPreview.previewTotalCents)}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Não aplicado até confirmação
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Oficial: Aplicar Desconto */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-2 active:scale-98"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aplicar desconto</span>
                </button>

                {appliedDiscount && isEditingDiscount && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDiscount(false)}
                  >
                    Cancelar edição
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Prazo de Produção */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Prazo Estimado de Produção (Dias Úteis)
              </label>
              <input
                type="number"
                min={1}
                value={productionDays}
                onChange={e => setProductionDays(Number(e.target.value))}
                className="w-32 px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </Card>

        {/* Card Resumo do Valor Total Oficial */}
        <Card className="p-6 flex flex-col justify-between bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 border-emerald-200/80 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-emerald-100 text-emerald-900">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Resumo Comercial</h2>
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'}):</span>
                <span className="font-mono font-semibold">{formatCentsToBRL(subtotalCents)}</span>
              </div>

              {appliedDiscount && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    Desconto {appliedDiscount.type === 'percentage' ? `(${appliedDiscount.value}%)` : ''}:
                  </span>
                  <span className="font-mono">-{formatCentsToBRL(appliedDiscountCents)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-emerald-200 flex justify-between items-baseline">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  Total da Proposta
                </span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {formatCentsToBRL(totalFinalCents)}
                </span>
              </div>

              {selectedSeller && (
                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-100">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vendedor: <strong className="text-slate-800">{selectedSeller.name}</strong></span>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full justify-center">
            Salvar e Emitir Orçamento
          </Button>
        </Card>
      </div>

      {/* 4. Condições Comerciais e Forma de Pagamento */}
      <Card className="p-6 space-y-4 bg-white border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Condições Comerciais e Forma de Pagamento
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Condição Comercial
            </label>
            <select
              value={paymentCondition}
              onChange={e => setPaymentCondition(e.target.value as PaymentCondition)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(PAYMENT_CONDITION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {paymentCondition === 'down_payment_and_balance' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Valor da Entrada (R$)"
              value={downPaymentStr}
              onChange={e => setDownPaymentStr(e.target.value)}
              placeholder="0,00"
              required
            />
            <Input
              label="Data Prevista da Entrada"
              type="date"
              value={expectedDownPaymentDate}
              onChange={e => setExpectedDownPaymentDate(e.target.value)}
              required
            />
            <Input
              label="Número de Parcelas do Saldo"
              type="number"
              min={1}
              value={installmentsCount}
              onChange={e => setInstallmentsCount(Number(e.target.value))}
              required
            />
          </div>
        )}

        {paymentCondition === 'installments' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Quantidade de Parcelas"
              type="number"
              min={2}
              value={installmentsCount}
              onChange={e => setInstallmentsCount(Number(e.target.value))}
              required
            />
            <Input
              label="Intervalo entre Parcelas (Dias)"
              type="number"
              min={1}
              value={installmentIntervalDays}
              onChange={e => setInstallmentIntervalDays(Number(e.target.value))}
              required
            />
          </div>
        )}

        <div>
          <Input
            label="Observações Comerciais e de Faturamento"
            value={financialNotes}
            onChange={e => setFinancialNotes(e.target.value)}
            placeholder="Ex: 50% antecipado para início de produção e restante na retirada."
          />
        </div>
      </Card>

      {/* 5. VENDEDOR E COMISSÃO — OPCIONAL (POSICIONADO AO FINAL DO FORMULÁRIO) */}
      <Card className="p-6 space-y-4 bg-white border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Vendedor e comissão — opcional
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Campos opcionais
          </span>
        </div>

        <div className="space-y-4">
          {/* Seletor Pesquisável de Vendedor Responsável (Opcional) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Vendedor Responsável (Opcional)
            </label>

            <div className="relative" ref={sellerDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSellerDropdownOpen(prev => !prev)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-left flex items-center justify-between hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all cursor-pointer"
              >
                {selectedSeller ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {getInitials(selectedSeller.name)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {selectedSeller.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {getProfileLabel(selectedSeller.baseProfile, selectedSeller.role)} • {selectedSeller.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Nenhum vendedor selecionado (salvar sem vendedor)</span>
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>

              {/* Dropdown Pesquisável */}
              {isSellerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-150">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={sellerSearchTerm}
                        onChange={e => setSellerSearchTerm(e.target.value)}
                        placeholder="Buscar vendedor na gráfica..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSellerId(null);
                        setIsSellerDropdownOpen(false);
                        setSellerSearchTerm('');
                      }}
                      className={`w-full p-2.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                        selectedSellerId === null
                          ? 'bg-emerald-50 text-emerald-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-600">
                        Sem vendedor vinculado
                      </div>
                      {selectedSellerId === null && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>

                    {filteredSellers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Nenhum usuário ativo encontrado.
                      </div>
                    ) : (
                      filteredSellers.map(seller => (
                        <button
                          key={seller.id}
                          type="button"
                          onClick={() => {
                            setSelectedSellerId(seller.id);
                            setIsSellerDropdownOpen(false);
                            setSellerSearchTerm('');
                          }}
                          className={`w-full p-2.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                            seller.id === selectedSellerId
                              ? 'bg-emerald-50 text-emerald-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                              {getInitials(seller.name)}
                            </div>
                            <div className="truncate">
                              <div className="font-bold text-xs text-slate-900 truncate">
                                {seller.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {getProfileLabel(seller.baseProfile, seller.role)} • {seller.email}
                              </div>
                            </div>
                          </div>

                          {seller.id === selectedSellerId && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dados Opcionais de Comissão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Porcentagem de Comissão (%) (Opcional)"
              value={commissionRatePercentInput}
              onChange={e => setCommissionRatePercentInput(e.target.value)}
              placeholder="Ex: 5"
            />
            <Input
              label="Valor Fixo de Comissão (R$) (Opcional)"
              value={commissionAmountInput}
              onChange={e => setCommissionAmountInput(e.target.value)}
              placeholder="Ex: 50,00"
            />
          </div>
        </div>
      </Card>

      {/* Modal de Confirmação de Remoção de Desconto */}
      {isRemoveDiscountModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseRemoveDiscountModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">Remover Desconto</span>
              <button
                type="button"
                onClick={handleCloseRemoveDiscountModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs text-slate-600 space-y-2">
              <p>
                Deseja remover o desconto aplicado? O valor total da proposta será recalculado para o subtotal original sem desconto ({formatCentsToBRL(subtotalCents)}).
              </p>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={handleCloseRemoveDiscountModal}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmRemoveDiscount}
              >
                Confirmar Remoção
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / SELETOR DE PRODUTOS DO CATÁLOGO OFICIAL */}
      {isCatalogPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCatalogPicker();
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <Package className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-black tracking-tight">
                  Selecione um Produto do Catálogo
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseCatalogPicker}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Busca e Filtro de Categoria */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Pesquisar por nome, SKU, substrato..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={catalogCategoryFilter}
                onChange={e => setCatalogCategoryFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas as Categorias</option>
                {PRODUCT_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Produtos */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {filteredCatalogProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum produto cadastrado corresponde à busca.
                </div>
              ) : (
                filteredCatalogProducts.map(prod => {
                  const catMeta = PRODUCT_CATEGORIES.find(c => c.id === prod.category);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProductFromCatalog(prod)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            {prod.sku}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700">
                            {prod.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • {catMeta?.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {prod.shortDescription}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                          <span>Substrato: <strong className="text-slate-700">{prod.defaultMaterial}</strong></span>
                          {prod.linkedFinishings && prod.linkedFinishings.length > 0 && (
                            <span>
                              Acabamentos: <strong className="text-slate-700">{prod.linkedFinishings.map(lf => lf.finishingName).join(', ')}</strong>
                            </span>
                          )}
                          <span>Prazo: <strong className="text-slate-700">{prod.productionDays}d</strong></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          {(() => {
                            const mode = prod.pricingMode || (prod.calculationUnit === 'm2' ? 'SQUARE_METER' : prod.calculationUnit === 'linear_meter' ? 'LINEAR_METER' : (prod.category === 'cartoes' || prod.category === 'promocional' ? 'LOT' : 'UNIT'));
                            if (mode === 'LOT') {
                              const lot = prod.lotSize || 1000;
                              return `Preço por lote de ${new Intl.NumberFormat('pt-BR').format(lot)}`;
                            }
                            if (mode === 'SQUARE_METER') return 'Preço por m²';
                            if (mode === 'LINEAR_METER') return 'Preço por metro linear';
                            return 'Preço por unidade';
                          })()}
                        </div>
                        {prod.hasPriceConfigured ? (
                          <div className="text-base font-black text-slate-900 font-mono">
                            {formatCentsToBRL(prod.salePriceCents)}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            A Definir
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsCatalogPickerOpen(false);
                  handleAddCustomItem();
                }}
                className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Item Personalizado / Fora da Tabela</span>
              </button>

              <Button type="button" variant="secondary" onClick={() => setIsCatalogPickerOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
