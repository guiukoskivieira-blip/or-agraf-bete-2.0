/**
 * @file product.repository.ts
 * @description Repositório Comercial de Produtos, Insumos e Acabamentos via Supabase PostgreSQL e RLS
 * @project OrçaGraf
 */

import { getSupabaseClient, isSupabaseConfigured, isModeConnected } from '../services/supabase-client';
import { Product, Material, Finishing } from '../types/product';
import {
  getInitialProductsTemplate,
  getInitialMaterialsTemplate,
  getInitialFinishingsTemplate,
  initializeTenantProducts,
  initializeTenantMaterials,
  initializeTenantFinishings,
} from '../domain/product-catalog';

// In-Memory Storage para modo standalone / testes
const inMemoryProducts: Map<string, Product[]> = new Map();
const inMemoryMaterials: Map<string, Material[]> = new Map();
const inMemoryFinishings: Map<string, Finishing[]> = new Map();

function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    tenantId: row.organization_id,
    sku: row.sku || '',
    name: row.name,
    category: row.category || 'prints',
    shortDescription: row.short_description || '',
    pricingMode: row.pricing_mode || 'UNIT',
    lotSize: row.lot_size || undefined,
    calculationUnit: row.calculation_unit || 'unit',
    defaultWidthMm: row.default_width_mm ? Number(row.default_width_mm) : undefined,
    defaultHeightMm: row.default_height_mm ? Number(row.default_height_mm) : undefined,
    defaultQuantity: row.default_quantity ? Number(row.default_quantity) : 1,
    defaultMaterial: row.default_material || '',
    availableMaterials: row.default_material ? [row.default_material] : [],
    defaultFinishing: row.default_finishing || '',
    availableFinishings: [],
    linkedFinishings: [],
    productionDays: row.production_days || 3,
    baseCostCents: Number(row.base_cost_cents || 0),
    markupPercent: Number(row.markup_percent || 0),
    salePriceCents: Number(row.sale_price_cents || 0),
    minSalePriceCents: Number(row.min_sale_price_cents || 0),
    hasPriceConfigured: Boolean(row.has_price_configured),
    isActive: Boolean(row.is_active),
    internalNotes: row.internal_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToMaterial(row: any): Material {
  return {
    id: row.id,
    tenantId: row.organization_id,
    name: row.name,
    category: row.category || 'Papéis',
    unit: row.unit || 'sheet',
    costPriceCents: Number(row.cost_price_cents || 0),
    salePriceCents: row.sale_price_cents !== null ? Number(row.sale_price_cents) : undefined,
    isActive: Boolean(row.is_active),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToFinishing(row: any): Finishing {
  return {
    id: row.id,
    tenantId: row.organization_id,
    name: row.name,
    description: row.description || '',
    pricingBasis: row.pricing_basis || 'FIXED',
    priceStatus: row.price_status || 'CONFIGURED',
    priceCents: Number(row.price_cents || 0),
    costPriceCents: row.cost_price_cents !== null ? Number(row.cost_price_cents) : undefined,
    salePriceCents: row.sale_price_cents !== null ? Number(row.sale_price_cents) : undefined,
    defaultMarkupPercent: row.default_markup_percent ? Number(row.default_markup_percent) : undefined,
    appliesToAllProducts: Boolean(row.applies_to_all_products),
    compatibleProductIds: [],
    isRequired: Boolean(row.is_required),
    isDefaultSelected: Boolean(row.is_default_selected),
    isActive: Boolean(row.is_active),
    notes: row.notes || '',
    dataOrigin: 'user',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductRepository {
  // =========================================================================
  // PRODUTOS
  // =========================================================================
  async listProducts(tenantId: string): Promise<Product[]> {
    if (!tenantId) return [];

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client indisponível.');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (error) {
        console.error('[ProductRepository.listProducts] Erro:', error);
        throw new Error(error.message);
      }

      return (data || []).map(mapRowToProduct);
    }

    // Modo Standalone
    let list = inMemoryProducts.get(tenantId);
    if (!list) {
      list = initializeTenantProducts([], tenantId);
      inMemoryProducts.set(tenantId, list);
    }
    return list;
  }

  async createProduct(
    tenantId: string,
    data: Partial<Product>
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    if (!tenantId) return { success: false, error: 'Tenant inválido.' };
    if (!data.name?.trim()) return { success: false, error: 'Nome do produto é obrigatório.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload = {
        organization_id: tenantId,
        sku: data.sku?.trim() || null,
        name: data.name.trim(),
        category: data.category || 'prints',
        short_description: data.shortDescription || null,
        pricing_mode: data.pricingMode || 'UNIT',
        lot_size: data.lotSize || null,
        calculation_unit: data.calculationUnit || 'unit',
        default_width_mm: data.defaultWidthMm || null,
        default_height_mm: data.defaultHeightMm || null,
        default_quantity: data.defaultQuantity || 1,
        default_material: data.defaultMaterial || null,
        default_finishing: data.defaultFinishing || null,
        production_days: data.productionDays || 3,
        base_cost_cents: data.baseCostCents || 0,
        markup_percent: data.markupPercent || 0,
        sale_price_cents: data.salePriceCents || 0,
        min_sale_price_cents: data.minSalePriceCents || 0,
        has_price_configured: data.hasPriceConfigured !== undefined ? data.hasPriceConfigured : (data.salePriceCents || 0) > 0,
        is_active: data.isActive !== false,
        internal_notes: data.internalNotes || null,
      };

      const { data: inserted, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, product: mapRowToProduct(inserted) };
    }

    const list = await this.listProducts(tenantId);
    const newProd: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
      name: data.name.trim(),
      category: data.category || 'prints',
      shortDescription: data.shortDescription || '',
      pricingMode: data.pricingMode || 'UNIT',
      lotSize: data.lotSize,
      calculationUnit: data.calculationUnit || 'unit',
      defaultWidthMm: data.defaultWidthMm,
      defaultHeightMm: data.defaultHeightMm,
      defaultQuantity: data.defaultQuantity || 1,
      defaultMaterial: data.defaultMaterial || '',
      availableMaterials: data.availableMaterials || [],
      defaultFinishing: data.defaultFinishing || '',
      availableFinishings: data.availableFinishings || [],
      linkedFinishings: data.linkedFinishings || [],
      productionDays: data.productionDays || 3,
      baseCostCents: data.baseCostCents || 0,
      markupPercent: data.markupPercent || 0,
      salePriceCents: data.salePriceCents || 0,
      minSalePriceCents: data.minSalePriceCents || 0,
      hasPriceConfigured: data.hasPriceConfigured !== undefined ? data.hasPriceConfigured : (data.salePriceCents || 0) > 0,
      isActive: data.isActive !== false,
      internalNotes: data.internalNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newProd);
    inMemoryProducts.set(tenantId, list);
    return { success: true, product: newProd };
  }

  async updateProduct(
    tenantId: string,
    id: string,
    data: Partial<Product>
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    if (!tenantId || !id) return { success: false, error: 'Parâmetros inválidos.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.sku !== undefined) payload.sku = data.sku.trim();
      if (data.category !== undefined) payload.category = data.category;
      if (data.shortDescription !== undefined) payload.short_description = data.shortDescription;
      if (data.pricingMode !== undefined) payload.pricing_mode = data.pricingMode;
      if (data.lotSize !== undefined) payload.lot_size = data.lotSize;
      if (data.calculationUnit !== undefined) payload.calculation_unit = data.calculationUnit;
      if (data.defaultWidthMm !== undefined) payload.default_width_mm = data.defaultWidthMm;
      if (data.defaultHeightMm !== undefined) payload.default_height_mm = data.defaultHeightMm;
      if (data.defaultQuantity !== undefined) payload.default_quantity = data.defaultQuantity;
      if (data.defaultMaterial !== undefined) payload.default_material = data.defaultMaterial;
      if (data.defaultFinishing !== undefined) payload.default_finishing = data.defaultFinishing;
      if (data.baseCostCents !== undefined) payload.base_cost_cents = data.baseCostCents;
      if (data.markupPercent !== undefined) payload.markup_percent = data.markupPercent;
      if (data.salePriceCents !== undefined) payload.sale_price_cents = data.salePriceCents;
      if (data.minSalePriceCents !== undefined) payload.min_sale_price_cents = data.minSalePriceCents;
      if (data.hasPriceConfigured !== undefined) payload.has_price_configured = data.hasPriceConfigured;
      if (data.isActive !== undefined) payload.is_active = data.isActive;

      const { data: updated, error } = await supabase
        .from('products')
        .update(payload)
        .eq('organization_id', tenantId)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, product: mapRowToProduct(updated) };
    }

    const list = await this.listProducts(tenantId);
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, error: 'Produto não encontrado.' };

    const updated = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    return { success: true, product: updated };
  }

  async deleteProduct(tenantId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', tenantId)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const list = await this.listProducts(tenantId);
    inMemoryProducts.set(tenantId, list.filter(p => p.id !== id));
    return { success: true };
  }

  // =========================================================================
  // INSUMOS (MATERIAIS)
  // =========================================================================
  async listMaterials(tenantId: string): Promise<Material[]> {
    if (!tenantId) return [];

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase indisponível.');

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw new Error(error.message);
      return (data || []).map(mapRowToMaterial);
    }

    let list = inMemoryMaterials.get(tenantId);
    if (!list) {
      list = initializeTenantMaterials([], tenantId);
      inMemoryMaterials.set(tenantId, list);
    }
    return list;
  }

  async createMaterial(
    tenantId: string,
    data: Partial<Material>
  ): Promise<{ success: boolean; material?: Material; error?: string }> {
    if (!tenantId) return { success: false, error: 'Tenant inválido.' };
    if (!data.name?.trim()) return { success: false, error: 'Nome do insumo obrigatório.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload = {
        organization_id: tenantId,
        name: data.name.trim(),
        category: data.category || 'Papéis',
        unit: data.unit || 'sheet',
        cost_price_cents: data.costPriceCents || 0,
        sale_price_cents: data.salePriceCents || 0,
        is_active: data.isActive !== false,
        notes: data.notes || null,
      };

      const { data: inserted, error } = await supabase
        .from('materials')
        .insert(payload)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, material: mapRowToMaterial(inserted) };
    }

    const list = await this.listMaterials(tenantId);
    const newMat: Material = {
      id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      name: data.name.trim(),
      category: data.category || 'Papéis',
      unit: data.unit || 'sheet',
      costPriceCents: data.costPriceCents || 0,
      salePriceCents: data.salePriceCents,
      isActive: data.isActive !== false,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newMat);
    inMemoryMaterials.set(tenantId, list);
    return { success: true, material: newMat };
  }

  async updateMaterial(
    tenantId: string,
    id: string,
    data: Partial<Material>
  ): Promise<{ success: boolean; material?: Material; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.category !== undefined) payload.category = data.category;
      if (data.unit !== undefined) payload.unit = data.unit;
      if (data.costPriceCents !== undefined) payload.cost_price_cents = data.costPriceCents;
      if (data.salePriceCents !== undefined) payload.sale_price_cents = data.salePriceCents;
      if (data.isActive !== undefined) payload.is_active = data.isActive;

      const { data: updated, error } = await supabase
        .from('materials')
        .update(payload)
        .eq('organization_id', tenantId)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, material: mapRowToMaterial(updated) };
    }

    const list = await this.listMaterials(tenantId);
    const idx = list.findIndex(m => m.id === id);
    if (idx === -1) return { success: false, error: 'Insumo não encontrado.' };
    const updated = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    return { success: true, material: updated };
  }

  async deleteMaterial(tenantId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { error } = await supabase
        .from('materials')
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', tenantId)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const list = await this.listMaterials(tenantId);
    inMemoryMaterials.set(tenantId, list.filter(m => m.id !== id));
    return { success: true };
  }

  // =========================================================================
  // ACABAMENTOS TÉCNICOS
  // =========================================================================
  async listFinishings(tenantId: string): Promise<Finishing[]> {
    if (!tenantId) return [];

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase indisponível.');

      const { data, error } = await supabase
        .from('finishings')
        .select('*')
        .eq('organization_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw new Error(error.message);
      return (data || []).map(mapRowToFinishing);
    }

    let list = inMemoryFinishings.get(tenantId);
    if (!list) {
      list = initializeTenantFinishings([], tenantId);
      inMemoryFinishings.set(tenantId, list);
    }
    return list;
  }

  async createFinishing(
    tenantId: string,
    data: Partial<Finishing>
  ): Promise<{ success: boolean; finishing?: Finishing; error?: string }> {
    if (!tenantId) return { success: false, error: 'Tenant inválido.' };
    if (!data.name?.trim()) return { success: false, error: 'Nome do acabamento obrigatório.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload = {
        organization_id: tenantId,
        name: data.name.trim(),
        description: data.description || null,
        pricing_basis: data.pricingBasis || 'FIXED',
        price_status: data.priceStatus || 'CONFIGURED',
        price_cents: data.priceCents || 0,
        cost_price_cents: data.costPriceCents || 0,
        sale_price_cents: data.salePriceCents || 0,
        applies_to_all_products: Boolean(data.appliesToAllProducts),
        is_required: Boolean(data.isRequired),
        is_default_selected: Boolean(data.isDefaultSelected),
        is_active: data.isActive !== false,
        notes: data.notes || null,
      };

      const { data: inserted, error } = await supabase
        .from('finishings')
        .insert(payload)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, finishing: mapRowToFinishing(inserted) };
    }

    const list = await this.listFinishings(tenantId);
    const newFin: Finishing = {
      id: `fin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      name: data.name.trim(),
      description: data.description || '',
      pricingBasis: data.pricingBasis || 'FIXED',
      priceStatus: data.priceStatus || 'CONFIGURED',
      priceCents: data.priceCents || 0,
      costPriceCents: data.costPriceCents,
      salePriceCents: data.salePriceCents,
      appliesToAllProducts: Boolean(data.appliesToAllProducts),
      compatibleProductIds: data.compatibleProductIds || [],
      isRequired: Boolean(data.isRequired),
      isDefaultSelected: Boolean(data.isDefaultSelected),
      isActive: data.isActive !== false,
      notes: data.notes || '',
      dataOrigin: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newFin);
    inMemoryFinishings.set(tenantId, list);
    return { success: true, finishing: newFin };
  }

  async updateFinishing(
    tenantId: string,
    id: string,
    data: Partial<Finishing>
  ): Promise<{ success: boolean; finishing?: Finishing; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.description !== undefined) payload.description = data.description;
      if (data.pricingBasis !== undefined) payload.pricing_basis = data.pricingBasis;
      if (data.priceStatus !== undefined) payload.price_status = data.priceStatus;
      if (data.priceCents !== undefined) payload.price_cents = data.priceCents;
      if (data.costPriceCents !== undefined) payload.cost_price_cents = data.costPriceCents;
      if (data.salePriceCents !== undefined) payload.sale_price_cents = data.salePriceCents;
      if (data.appliesToAllProducts !== undefined) payload.applies_to_all_products = data.appliesToAllProducts;
      if (data.isRequired !== undefined) payload.is_required = data.isRequired;
      if (data.isDefaultSelected !== undefined) payload.is_default_selected = data.isDefaultSelected;
      if (data.isActive !== undefined) payload.is_active = data.isActive;

      const { data: updated, error } = await supabase
        .from('finishings')
        .update(payload)
        .eq('organization_id', tenantId)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, finishing: mapRowToFinishing(updated) };
    }

    const list = await this.listFinishings(tenantId);
    const idx = list.findIndex(f => f.id === id);
    if (idx === -1) return { success: false, error: 'Acabamento não encontrado.' };
    const updated = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    return { success: true, finishing: updated };
  }

  async deleteFinishing(tenantId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { error } = await supabase
        .from('finishings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', tenantId)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const list = await this.listFinishings(tenantId);
    inMemoryFinishings.set(tenantId, list.filter(f => f.id !== id));
    return { success: true };
  }

  // Utilitário para testes
  _clearForTest(tenantId?: string) {
    if (tenantId) {
      inMemoryProducts.delete(tenantId);
      inMemoryMaterials.delete(tenantId);
      inMemoryFinishings.delete(tenantId);
    } else {
      inMemoryProducts.clear();
      inMemoryMaterials.clear();
      inMemoryFinishings.clear();
    }
  }
}

export const productRepository = new ProductRepository();
