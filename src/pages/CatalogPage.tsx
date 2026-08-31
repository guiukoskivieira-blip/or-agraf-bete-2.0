/**
 * @file CatalogPage.tsx
 * @description Catálogo Comercial Unificado: Produtos, Insumos (Materiais) e Acabamentos Gráficos
 * @routes /catalog/products, /catalog/supplies, /catalog/finishes
 * @project OrçaGraf
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Scissors,
  Search,
  PlusCircle,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  Tag,
  Check,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useCommercial } from '../context/CommercialContext';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationContext';
import {
  Product,
  Material,
  Finishing,
  PRODUCT_CATEGORIES,
  CalculationUnit,
  PricingMode,
  PRICING_MODES,
  FinishingPricingBasis,
  FinishingPriceStatus,
} from '../types/product';
import { formatCentsToBRL, parseBRLToCents } from '../domain/money';
import { inferPricingMode } from '../domain/pricing-engine';

export type CatalogTab = 'products' | 'supplies' | 'finishes';

interface CatalogPageProps {
  initialTab?: CatalogTab;
  onNavigateTab: (tab: CatalogTab) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialTab = 'products',
  onNavigateTab,
}) => {
  const {
    products,
    materials,
    finishings,
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
  } = useCommercial();

  const { showNotice } = useNotification();

  const [activeTab, setActiveTab] = useState<CatalogTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Sincroniza tab com URL externa se alterada
  const handleSelectTab = (tab: CatalogTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    onNavigateTab(tab);
  };

  // ==========================================
  // MODAIS E ESTADOS DE EDIÇÃO
  // ==========================================
  // Modal de Produto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    sku: string;
    category: string;
    pricingMode: PricingMode;
    lotSizeStr: string;
    calculationUnit: CalculationUnit;
    salePriceStr: string;
    minSalePriceStr: string;
    defaultMaterial: string;
    defaultFinishing: string;
    linkedFinishings: { finishingName: string; isRequired: boolean; isDefaultSelected: boolean }[];
  }>({
    name: '',
    sku: '',
    category: 'prints',
    pricingMode: 'UNIT',
    lotSizeStr: '1000',
    calculationUnit: 'unit',
    salePriceStr: '0,00',
    minSalePriceStr: '0,00',
    defaultMaterial: '',
    defaultFinishing: '',
    linkedFinishings: [],
  });

  // Modal de Insumo (Material)
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState<{
    name: string;
    category: string;
    unit: 'sheet' | 'm2' | 'kg' | 'unit' | 'roll';
    costPriceStr: string;
    salePriceStr: string;
    notes: string;
  }>({
    name: '',
    category: 'Papéis',
    unit: 'sheet',
    costPriceStr: '0,00',
    salePriceStr: '0,00',
    notes: '',
  });

  // Modal de Acabamento
  const [isFinishingModalOpen, setIsFinishingModalOpen] = useState(false);
  const [editingFinishing, setEditingFinishing] = useState<Finishing | null>(null);
  const [productSearchInModal, setProductSearchInModal] = useState('');
  const [finishingForm, setFinishingForm] = useState<{
    name: string;
    description: string;
    pricingBasis: FinishingPricingBasis;
    priceType: 'charged' | 'free' | 'not_configured';
    priceStr: string;
    isRequired: boolean;
    isDefaultSelected: boolean;
    compatibleProductIds: string[];
    appliesToAllProducts: boolean;
    notes: string;
  }>({
    name: '',
    description: '',
    pricingBasis: 'PER_UNIT',
    priceType: 'not_configured',
    priceStr: '0,00',
    isRequired: false,
    isDefaultSelected: false,
    compatibleProductIds: [],
    appliesToAllProducts: false,
    notes: '',
  });

  // ==========================================
  // FILTRAGENS
  // ==========================================
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.isActive) ||
        (statusFilter === 'inactive' && !p.isActive);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && m.isActive) ||
        (statusFilter === 'inactive' && !m.isActive);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [materials, searchTerm, categoryFilter, statusFilter]);

  const filteredFinishings = useMemo(() => {
    return finishings.filter(f => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.notes && f.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && f.isActive) ||
        (statusFilter === 'inactive' && !f.isActive);

      return matchSearch && matchStatus;
    });
  }, [finishings, searchTerm, statusFilter]);

  // ==========================================
  // MODAL HANDLERS COM FOCO E TECLA ESCAPE
  // ==========================================
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    triggerRef.current?.focus();
  };

  const handleCloseMaterialModal = () => {
    setIsMaterialModalOpen(false);
    triggerRef.current?.focus();
  };

  const handleCloseFinishingModal = () => {
    setIsFinishingModalOpen(false);
    triggerRef.current?.focus();
  };

  React.useEffect(() => {
    const isAnyOpen = isProductModalOpen || isMaterialModalOpen || isFinishingModalOpen;
    if (!isAnyOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isFinishingModalOpen) handleCloseFinishingModal();
        else if (isMaterialModalOpen) handleCloseMaterialModal();
        else if (isProductModalOpen) handleCloseProductModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProductModalOpen, isMaterialModalOpen, isFinishingModalOpen]);

  // ==========================================
  // PRODUTOS HANDLERS
  // ==========================================
  const handleOpenCreateProduct = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: 'prints',
      pricingMode: 'UNIT',
      lotSizeStr: '1000',
      calculationUnit: 'unit',
      salePriceStr: '0,00',
      minSalePriceStr: '0,00',
      defaultMaterial: materials[0]?.name || '',
      defaultFinishing: '',
      linkedFinishings: [],
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingProduct(p);
    const mode = p.pricingMode || inferPricingMode(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      pricingMode: mode,
      lotSizeStr: p.lotSize ? String(p.lotSize) : '1000',
      calculationUnit: p.calculationUnit,
      salePriceStr: (p.salePriceCents / 100).toFixed(2).replace('.', ','),
      minSalePriceStr: ((p.minSalePriceCents || 0) / 100).toFixed(2).replace('.', ','),
      defaultMaterial: p.defaultMaterial || '',
      defaultFinishing: p.defaultFinishing || '',
      linkedFinishings: p.linkedFinishings
        ? p.linkedFinishings.map(lf => ({
            finishingName: lf.finishingName,
            isRequired: Boolean(lf.isRequired),
            isDefaultSelected: Boolean(lf.isDefaultSelected),
          }))
        : [],
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showNotice('Campo Obrigatório', 'Informe o nome do produto.', 'warning');
      return;
    }

    const salePriceCents = parseBRLToCents(productForm.salePriceStr);
    const minSalePriceCents = parseBRLToCents(productForm.minSalePriceStr);

    let lotSize: number | undefined;
    if (productForm.pricingMode === 'LOT') {
      const parsedLot = parseInt(productForm.lotSizeStr, 10);
      if (!parsedLot || parsedLot <= 0) {
        showNotice('Lote Inválido', 'Informe um tamanho de lote válido (maior que zero).', 'warning');
        return;
      }
      lotSize = parsedLot;
    }

    const mappedCalcUnit: CalculationUnit =
      productForm.pricingMode === 'SQUARE_METER'
        ? 'm2'
        : productForm.pricingMode === 'LINEAR_METER'
        ? 'linear_meter'
        : 'unit';

    const payload: Partial<Product> = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      category: productForm.category,
      pricingMode: productForm.pricingMode,
      lotSize,
      calculationUnit: mappedCalcUnit,
      salePriceCents,
      minSalePriceCents,
      hasPriceConfigured: salePriceCents > 0,
      defaultMaterial: productForm.defaultMaterial.trim(),
      defaultFinishing: productForm.defaultFinishing.trim(),
      linkedFinishings: productForm.linkedFinishings.map((lf, idx) => ({
        finishingName: lf.finishingName,
        isRequired: lf.isRequired,
        isDefaultSelected: lf.isDefaultSelected,
        isActive: true,
        displayOrder: idx + 1,
      })),
      availableMaterials: productForm.defaultMaterial ? [productForm.defaultMaterial] : [],
      availableFinishings: productForm.linkedFinishings.map(lf => lf.finishingName),
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
    } else {
      createProduct(payload);
    }

    handleCloseProductModal();
  };

  const handleDeleteProduct = (p: Product) => {
    if (isProductUsedInQuotes(p.id)) {
      showNotice(
        'Bloqueio de Exclusão',
        `O produto "${p.name}" está vinculado a orçamentos existentes e não pode ser excluído para preservar o histórico comercial. Desative-o se não desejar novas vendas.`,
        'warning'
      );
      return;
    }

    if (confirm(`Deseja excluir permanentemente o produto "${p.name}"?`)) {
      deleteProduct(p.id);
    }
  };

  // ==========================================
  // INSUMOS (MATERIAIS) HANDLERS
  // ==========================================
  const handleOpenCreateMaterial = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingMaterial(null);
    setMaterialForm({
      name: '',
      category: 'Papéis',
      unit: 'sheet',
      costPriceStr: '0,00',
      salePriceStr: '0,00',
      notes: '',
    });
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (m: Material) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingMaterial(m);
    setMaterialForm({
      name: m.name,
      category: m.category,
      unit: m.unit,
      costPriceStr: (m.costPriceCents / 100).toFixed(2).replace('.', ','),
      salePriceStr: ((m.salePriceCents || 0) / 100).toFixed(2).replace('.', ','),
      notes: m.notes || '',
    });
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name.trim()) {
      showNotice('Campo Obrigatório', 'Informe o nome do insumo.', 'warning');
      return;
    }

    const costPriceCents = parseBRLToCents(materialForm.costPriceStr);
    const salePriceCents = parseBRLToCents(materialForm.salePriceStr);

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, {
        name: materialForm.name.trim(),
        category: materialForm.category.trim(),
        unit: materialForm.unit,
        costPriceCents,
        salePriceCents,
        notes: materialForm.notes.trim(),
      });
    } else {
      createMaterial({
        name: materialForm.name.trim(),
        category: materialForm.category.trim(),
        unit: materialForm.unit,
        costPriceCents,
        salePriceCents,
        notes: materialForm.notes.trim(),
      });
    }

    handleCloseMaterialModal();
  };

  // ==========================================
  // ACABAMENTOS HANDLERS
  // ==========================================
  const handleOpenCreateFinishing = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingFinishing(null);
    setProductSearchInModal('');
    setFinishingForm({
      name: '',
      description: '',
      pricingBasis: 'PER_UNIT',
      priceType: 'not_configured',
      priceStr: '0,00',
      isRequired: false,
      isDefaultSelected: false,
      compatibleProductIds: [],
      appliesToAllProducts: false,
      notes: '',
    });
    setIsFinishingModalOpen(true);
  };

  const handleOpenEditFinishing = (f: Finishing) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingFinishing(f);
    setProductSearchInModal('');
    const pType: 'charged' | 'free' | 'not_configured' =
      f.priceStatus === 'FREE'
        ? 'free'
        : f.priceStatus === 'CONFIGURED' || (f.priceCents && f.priceCents > 0)
        ? 'charged'
        : 'not_configured';

    setFinishingForm({
      name: f.name,
      description: f.description || '',
      pricingBasis: f.pricingBasis || (f.pricingMethod as any) || 'PER_UNIT',
      priceType: pType,
      priceStr: ((f.priceCents || f.costPriceCents || 0) / 100).toFixed(2).replace('.', ','),
      isRequired: Boolean(f.isRequired),
      isDefaultSelected: Boolean(f.isDefaultSelected),
      compatibleProductIds: Array.isArray(f.compatibleProductIds) ? f.compatibleProductIds : [],
      appliesToAllProducts: Boolean(f.appliesToAllProducts),
      notes: f.notes || '',
    });
    setIsFinishingModalOpen(true);
  };

  const handleSaveFinishing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingForm.name.trim()) {
      showNotice('Campo Obrigatório', 'Informe o nome do acabamento.', 'warning');
      return;
    }

    let priceStatus: FinishingPriceStatus = 'NOT_CONFIGURED';
    let priceCents = 0;

    if (finishingForm.priceType === 'free') {
      priceStatus = 'FREE';
      priceCents = 0;
    } else if (finishingForm.priceType === 'charged') {
      priceStatus = 'CONFIGURED';
      priceCents = parseBRLToCents(finishingForm.priceStr);
      if (priceCents <= 0) {
        showNotice('Preço Obrigatório', 'Para acabamentos cobrados, informe um valor maior que R$ 0,00.', 'warning');
        return;
      }
    } else {
      priceStatus = 'NOT_CONFIGURED';
      priceCents = 0;
    }

    const compatibleProductIds = finishingForm.appliesToAllProducts ? [] : finishingForm.compatibleProductIds;
    const appliesToAllProducts = finishingForm.appliesToAllProducts;

    // Deriva nomes dos produtos para histórico legível
    const compatibleNames = appliesToAllProducts
      ? ['Todos os produtos']
      : compatibleProductIds
          .map(id => products.find(p => p.id === id)?.name)
          .filter((name): name is string => Boolean(name));

    if (editingFinishing) {
      updateFinishing(editingFinishing.id, {
        name: finishingForm.name.trim(),
        description: finishingForm.description.trim(),
        pricingBasis: finishingForm.pricingBasis,
        pricingMethod: finishingForm.pricingBasis,
        priceStatus,
        priceCents,
        costPriceCents: priceCents,
        salePriceCents: priceCents,
        isRequired: finishingForm.isRequired,
        isDefaultSelected: finishingForm.isDefaultSelected,
        compatibleProductIds,
        appliesToAllProducts,
        compatibleProducts: compatibleNames,
        notes: finishingForm.notes.trim(),
      });
    } else {
      createFinishing({
        name: finishingForm.name.trim(),
        description: finishingForm.description.trim(),
        pricingBasis: finishingForm.pricingBasis,
        pricingMethod: finishingForm.pricingBasis,
        priceStatus,
        priceCents,
        costPriceCents: priceCents,
        salePriceCents: priceCents,
        isRequired: finishingForm.isRequired,
        isDefaultSelected: finishingForm.isDefaultSelected,
        compatibleProductIds,
        appliesToAllProducts,
        compatibleProducts: compatibleNames,
        notes: finishingForm.notes.trim(),
      });
    }

    handleCloseFinishingModal();
  };

  return (
    <div className="space-y-6">
      {/* Header com 3 Abas Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Catálogo Comercial</h1>
          <p className="text-sm text-slate-500">
            Gerencie o catálogo de produtos gráficos, insumos/substratos e acabamentos técnicos cadastrados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <Button
              variant="primary"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={handleOpenCreateProduct}
            >
              Novo Produto
            </Button>
          )}
          {activeTab === 'supplies' && (
            <Button
              variant="primary"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={handleOpenCreateMaterial}
            >
              Novo Insumo
            </Button>
          )}
          {activeTab === 'finishes' && (
            <Button
              variant="primary"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={handleOpenCreateFinishing}
            >
              Novo Acabamento
            </Button>
          )}
        </div>
      </div>

      {/* Navegação de Abas do Catálogo */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleSelectTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('supplies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'supplies'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Insumos / Substratos ({materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('finishes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'finishes'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Acabamentos Técnicos ({finishings.length})</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Buscar em ${
              activeTab === 'products' ? 'produtos' : activeTab === 'supplies' ? 'insumos' : 'acabamentos'
            }...`}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {activeTab === 'products' && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Categorias</option>
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Apenas Ativos</option>
          <option value="inactive">Apenas Inativos</option>
        </select>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: PRODUTOS */}
      {/* ============================================================ */}
      {activeTab === 'products' && (
        <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Produto & SKU</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Substrato Padrão</th>
                  <th className="py-3 px-4">Preço de Venda</th>
                  <th className="py-3 px-4">Acabamentos Vinculados</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map(product => {
                  const mode = product.pricingMode || inferPricingMode(product);
                  return (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{product.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{product.sku}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {PRODUCT_CATEGORIES.find(c => c.id === product.category)?.label || product.category}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {product.defaultMaterial || 'Não definido'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {product.hasPriceConfigured ? (
                        <div>
                          <span className="font-bold text-slate-900 text-xs">
                            {formatCentsToBRL(product.salePriceCents)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            {mode === 'LOT'
                              ? `/lote de ${new Intl.NumberFormat('pt-BR').format(product.lotSize || 1000)} un.`
                              : mode === 'SQUARE_METER'
                              ? '/m²'
                              : mode === 'LINEAR_METER'
                              ? '/m linear'
                              : '/un.'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Preço Manual
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {product.linkedFinishings && product.linkedFinishings.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {product.linkedFinishings.map((lf, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                lf.isRequired
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : lf.isDefaultSelected
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {lf.finishingName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Nenhum</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={product.isActive ? 'success' : 'neutral'} size="sm">
                        {product.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Duplicar Produto"
                          icon={<Copy className="w-3.5 h-3.5" />}
                          onClick={() => duplicateProduct(product.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar Produto"
                          icon={<Edit className="w-3.5 h-3.5 text-emerald-600" />}
                          onClick={() => handleOpenEditProduct(product)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          title={product.isActive ? 'Desativar' : 'Ativar'}
                          className={product.isActive ? 'text-amber-600' : 'text-emerald-600'}
                          onClick={() => toggleProductActive(product.id)}
                        >
                          {product.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Excluir"
                          className="text-rose-600 hover:bg-rose-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => handleDeleteProduct(product)}
                        />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ABA 2: INSUMOS (MATERIAIS) */}
      {/* ============================================================ */}
      {activeTab === 'supplies' && (
        <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nome do Insumo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Unidade de Medida</th>
                  <th className="py-3 px-4">Custo Base</th>
                  <th className="py-3 px-4">Preço de Venda</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMaterials.map(mat => (
                  <tr key={mat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                      {mat.name}
                      {mat.notes && <div className="text-[10px] text-slate-400 font-normal">{mat.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{mat.category}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                        {mat.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {mat.costPriceCents > 0 ? formatCentsToBRL(mat.costPriceCents) : 'R$ 0,00'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {mat.salePriceCents && mat.salePriceCents > 0 ? formatCentsToBRL(mat.salePriceCents) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={mat.isActive ? 'success' : 'neutral'} size="sm">
                        {mat.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit className="w-3.5 h-3.5 text-emerald-600" />}
                          onClick={() => handleOpenEditMaterial(mat)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={mat.isActive ? 'text-amber-600' : 'text-emerald-600'}
                          onClick={() => toggleMaterialActive(mat.id)}
                        >
                          {mat.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => deleteMaterial(mat.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ABA 3: ACABAMENTOS TÉCNICOS */}
      {/* ============================================================ */}
      {activeTab === 'finishes' && (
        <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Acabamento</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Base de Cobrança</th>
                  <th className="py-3 px-4">Preço Comercial</th>
                  <th className="py-3 px-4">Produtos Compatíveis</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredFinishings.map(fin => {
                  const basis = fin.pricingBasis || 'PER_UNIT';
                  const basisLabel =
                    basis === 'FIXED'
                      ? 'Valor fixo por item'
                      : basis === 'PER_LOT'
                      ? 'Por lote'
                      : basis === 'PER_SQUARE_METER'
                      ? 'Por metro quadrado'
                      : basis === 'PER_LINEAR_METER'
                      ? 'Por metro linear'
                      : 'Por unidade';

                  const priceVal = fin.priceCents !== undefined ? fin.priceCents : (fin.costPriceCents || 0);
                  const isFree = fin.priceStatus === 'FREE' || (fin.isRequired && priceVal === 0);
                  const isNotConfigured = fin.priceStatus === 'NOT_CONFIGURED' || (!fin.priceStatus && priceVal === 0 && !fin.isRequired);

                  let priceDisplay = '';
                  if (isFree) {
                    priceDisplay = 'Incluso sem custo';
                  } else if (isNotConfigured) {
                    priceDisplay = 'Preço não configurado';
                  } else {
                    const fmt = formatCentsToBRL(priceVal);
                    if (basis === 'FIXED') priceDisplay = `${fmt} por item`;
                    else if (basis === 'PER_LOT') priceDisplay = `${fmt} por lote`;
                    else if (basis === 'PER_SQUARE_METER') priceDisplay = `${fmt} por m²`;
                    else if (basis === 'PER_LINEAR_METER') priceDisplay = `${fmt} por metro linear`;
                    else priceDisplay = `${fmt} por unidade`;
                  }

                  return (
                    <tr key={fin.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                        {fin.name}
                        {(fin.description || fin.notes) && (
                          <div className="text-[10px] text-slate-400 font-normal">{fin.description || fin.notes}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {fin.isRequired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Obrigatório
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Opcional
                            </span>
                          )}
                          {fin.isDefaultSelected && !fin.isRequired && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Padrão
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        {basisLabel}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {isFree ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {priceDisplay}
                          </span>
                        ) : isNotConfigured ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {priceDisplay}
                          </span>
                        ) : (
                          <div className="font-bold text-slate-900 text-xs">
                            {priceDisplay}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        {fin.appliesToAllProducts ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Todos os produtos (Global)
                          </span>
                        ) : fin.compatibleProductIds && fin.compatibleProductIds.length > 0 ? (
                          <div
                            className="truncate max-w-[220px]"
                            title={fin.compatibleProductIds
                              .map(id => products.find(p => p.id === id)?.name || 'Produto indisponível')
                              .join(', ')}
                          >
                            {fin.compatibleProductIds
                              .map(id => products.find(p => p.id === id)?.name || 'Produto indisponível')
                              .join(', ')}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Nenhum produto compatível</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={fin.isActive ? 'success' : 'neutral'} size="sm">
                          {fin.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {fin.dataOrigin === 'user' ? 'Usuário' : 'Demonstração'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="w-3.5 h-3.5 text-emerald-600" />}
                            onClick={() => handleOpenEditFinishing(fin)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className={fin.isActive ? 'text-amber-600' : 'text-emerald-600'}
                            onClick={() => toggleFinishingActive(fin.id)}
                          >
                            {fin.isActive ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => deleteFinishing(fin.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* MODAL: PRODUTO */}
      {/* ============================================================ */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseProductModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editingProduct ? 'Editar Produto do Catálogo' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={handleCloseProductModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nome Comercial do Produto *"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Cartão de Visita, Banner..."
                  required
                />
                <Input
                  label="SKU / Código Único"
                  value={productForm.sku}
                  onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="Ex: PROD-001"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={productForm.category}
                    onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Modalidade de Preço
                  </label>
                  <select
                    value={productForm.pricingMode}
                    onChange={e => setProductForm({ ...productForm, pricingMode: e.target.value as PricingMode })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {PRICING_MODES.map(mode => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label} ({mode.shortSuffix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {productForm.pricingMode === 'LOT' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <Info className="w-4 h-4 text-emerald-600" />
                    <span>Configuração de Lote / Tiragem</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    O preço cadastrado será o valor cobrado por cada lote fechado de unidades (ex: R$ 70,00 por lote de 1.000 un.).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Input
                      label="Tamanho do Lote (unidades) *"
                      type="number"
                      min="1"
                      value={productForm.lotSizeStr}
                      onChange={e => setProductForm({ ...productForm, lotSizeStr: e.target.value })}
                      placeholder="1000"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={
                    productForm.pricingMode === 'LOT'
                      ? `Preço por Lote de ${productForm.lotSizeStr || '1.000'} un. (R$) *`
                      : productForm.pricingMode === 'SQUARE_METER'
                      ? 'Preço por m² (R$) *'
                      : productForm.pricingMode === 'LINEAR_METER'
                      ? 'Preço por Metro Linear (R$) *'
                      : 'Preço por Unidade (R$) *'
                  }
                  value={productForm.salePriceStr}
                  onChange={e => setProductForm({ ...productForm, salePriceStr: e.target.value })}
                  placeholder="0,00"
                  required
                />
                <Input
                  label="Preço Mínimo de Faturamento (R$)"
                  value={productForm.minSalePriceStr}
                  onChange={e => setProductForm({ ...productForm, minSalePriceStr: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Substrato / Insumo Principal
                </label>
                <select
                  value={productForm.defaultMaterial}
                  onChange={e => setProductForm({ ...productForm, defaultMaterial: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione um substrato do catálogo...</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vínculo de Acabamentos */}
              <div className="pt-2">
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Acabamentos Vinculados a este Produto
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2">
                  {finishings.map(fin => {
                    const linked = productForm.linkedFinishings.find(lf => lf.finishingName === fin.name);
                    const isLinked = Boolean(linked);

                    return (
                      <div key={fin.id} className="py-2 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={e => {
                              if (e.target.checked) {
                                setProductForm({
                                  ...productForm,
                                  linkedFinishings: [
                                    ...productForm.linkedFinishings,
                                    { finishingName: fin.name, isRequired: false, isDefaultSelected: true },
                                  ],
                                });
                              } else {
                                setProductForm({
                                  ...productForm,
                                  linkedFinishings: productForm.linkedFinishings.filter(
                                    lf => lf.finishingName !== fin.name
                                  ),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                          />
                          <span className="font-bold text-slate-800">{fin.name}</span>
                        </label>

                        {isLinked && (
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={linked?.isRequired || false}
                                onChange={e => {
                                  setProductForm({
                                    ...productForm,
                                    linkedFinishings: productForm.linkedFinishings.map(lf =>
                                      lf.finishingName === fin.name ? { ...lf, isRequired: e.target.checked } : lf
                                    ),
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded text-rose-600 border-slate-300"
                              />
                              <span>Obrigatório</span>
                            </label>

                            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={linked?.isDefaultSelected || false}
                                onChange={e => {
                                  setProductForm({
                                    ...productForm,
                                    linkedFinishings: productForm.linkedFinishings.map(lf =>
                                      lf.finishingName === fin.name ? { ...lf, isDefaultSelected: e.target.checked } : lf
                                    ),
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                              />
                              <span>Auto Marcar</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={handleCloseProductModal}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Salvar Produto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: INSUMO */}
      {/* ============================================================ */}
      {isMaterialModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseMaterialModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editingMaterial ? 'Editar Insumo' : 'Novo Insumo / Substrato'}
              </h3>
              <button
                type="button"
                onClick={handleCloseMaterialModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-5 space-y-4 text-xs">
              <Input
                label="Nome do Insumo *"
                value={materialForm.name}
                onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                placeholder="Ex: Papel Couchê 300g, Lona Frontlight..."
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Categoria"
                  value={materialForm.category}
                  onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                  placeholder="Ex: Papéis, Lonas..."
                />
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={materialForm.unit}
                    onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="sheet">Folha (sheet)</option>
                    <option value="m2">Metro Quadrado (m²)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="unit">Unidade (unit)</option>
                    <option value="roll">Rolo (roll)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Custo Base (R$)"
                  value={materialForm.costPriceStr}
                  onChange={e => setMaterialForm({ ...materialForm, costPriceStr: e.target.value })}
                  placeholder="0,00"
                />
                <Input
                  label="Preço de Venda (R$)"
                  value={materialForm.salePriceStr}
                  onChange={e => setMaterialForm({ ...materialForm, salePriceStr: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={handleCloseMaterialModal}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Salvar Insumo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ACABAMENTO */}
      {/* ============================================================ */}
      {isFinishingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseFinishingModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editingFinishing ? 'Editar Acabamento Técnico' : 'Novo Acabamento Técnico'}
              </h3>
              <button
                type="button"
                onClick={handleCloseFinishingModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFinishing} className="p-5 space-y-4 text-xs">
              <Input
                label="Nome do Acabamento *"
                value={finishingForm.name}
                onChange={e => setFinishingForm({ ...finishingForm, name: e.target.value })}
                placeholder="Ex: Corte Reto, Laminação Fosca, Verniz..."
                required
              />

              <Input
                label="Descrição Técnica / Instruções (Opcional)"
                value={finishingForm.description}
                onChange={e => setFinishingForm({ ...finishingForm, description: e.target.value })}
                placeholder="Detalhes sobre o processo gráfico..."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Base de Cobrança
                  </label>
                  <select
                    value={finishingForm.pricingBasis}
                    onChange={e =>
                      setFinishingForm({ ...finishingForm, pricingBasis: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PER_UNIT">Por Unidade Produzida</option>
                    <option value="FIXED">Valor Fixo por Item</option>
                    <option value="PER_LOT">Por Lote Fechado</option>
                    <option value="PER_SQUARE_METER">Por Metro Quadrado (m²)</option>
                    <option value="PER_LINEAR_METER">Por Metro Linear</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tipo de Preço
                  </label>
                  <select
                    value={finishingForm.priceType}
                    onChange={e => setFinishingForm({ ...finishingForm, priceType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="charged">Cobrado (Com Valor)</option>
                    <option value="free">Incluso sem Custo Adicional</option>
                    <option value="not_configured">Preço não configurado</option>
                  </select>
                </div>
              </div>

              {finishingForm.priceType === 'charged' && (
                <div>
                  <Input
                    label="Preço Comercial (R$)"
                    value={finishingForm.priceStr}
                    onChange={e => setFinishingForm({ ...finishingForm, priceStr: e.target.value })}
                    placeholder="0,00"
                    helperText={`Cobrado ${
                      finishingForm.pricingBasis === 'FIXED'
                        ? 'como valor fixo no item'
                        : finishingForm.pricingBasis === 'PER_LOT'
                        ? 'por lote de produto'
                        : finishingForm.pricingBasis === 'PER_SQUARE_METER'
                        ? 'por m²'
                        : finishingForm.pricingBasis === 'PER_LINEAR_METER'
                        ? 'por metro linear'
                        : 'por unidade'
                    }`}
                  />
                </div>
              )}

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={finishingForm.isRequired}
                    onChange={e => setFinishingForm({ ...finishingForm, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span className="font-bold text-slate-800">Acabamento Técnico Obrigatório (Padrão)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={finishingForm.isDefaultSelected}
                    onChange={e => setFinishingForm({ ...finishingForm, isDefaultSelected: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span className="font-bold text-slate-800">Selecionar Automaticamente ao Adicionar Produto</span>
                </label>
              </div>

              {/* Seletor Múltiplo de Produtos Compatíveis */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                    Produtos Compatíveis
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={finishingForm.appliesToAllProducts}
                      onChange={e =>
                        setFinishingForm({
                          ...finishingForm,
                          appliesToAllProducts: e.target.checked,
                          compatibleProductIds: e.target.checked ? [] : finishingForm.compatibleProductIds,
                        })
                      }
                      className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                    />
                    <span className="font-medium text-slate-700">Compatível com todos os produtos</span>
                  </label>
                </div>

                {!finishingForm.appliesToAllProducts ? (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearchInModal}
                        onChange={e => setProductSearchInModal(e.target.value)}
                        placeholder="Filtrar produtos compatíveis..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="text-[11px] font-medium text-slate-600 flex justify-between">
                      <span>
                        {finishingForm.compatibleProductIds.length > 0
                          ? `${finishingForm.compatibleProductIds.length} produto(s) selecionado(s)`
                          : 'Nenhum produto compatível selecionado'}
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {products
                        .filter(p => p.isActive !== false)
                        .filter(p => {
                          if (!productSearchInModal.trim()) return true;
                          const term = productSearchInModal.toLowerCase();
                          return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
                        })
                        .map(prod => {
                          const isSelected = finishingForm.compatibleProductIds.includes(prod.id);
                          return (
                            <label
                              key={prod.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                                  : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100/60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setFinishingForm({
                                        ...finishingForm,
                                        compatibleProductIds: [...finishingForm.compatibleProductIds, prod.id],
                                      });
                                    } else {
                                      setFinishingForm({
                                        ...finishingForm,
                                        compatibleProductIds: finishingForm.compatibleProductIds.filter(id => id !== prod.id),
                                      });
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                                />
                                <div>
                                  <div className="text-xs">{prod.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{prod.sku}</div>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                {prod.pricingMode === 'LOT'
                                  ? `Lote (${prod.lotSize || 1000} un.)`
                                  : prod.pricingMode === 'SQUARE_METER'
                                  ? 'm²'
                                  : prod.pricingMode === 'LINEAR_METER'
                                  ? 'm lin.'
                                  : 'Un.'}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Este acabamento estará disponível para todos os produtos do catálogo.</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={handleCloseFinishingModal}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Salvar Acabamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
