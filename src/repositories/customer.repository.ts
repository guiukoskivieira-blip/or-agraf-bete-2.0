/**
 * @file customer.repository.ts
 * @description Repositório Comercial de Clientes com Suporte a Supabase PostgreSQL e RLS
 * @project OrçaGraf
 */

import { getSupabaseClient, isSupabaseConfigured, isModeConnected } from '../services/supabase-client';
import { Customer, CustomerType, CustomerAddress, CustomerContact } from '../types/customer';
import { sanitizeDocument, isValidEmailFormat } from '../domain/customer-repository';

export interface CustomerCreateInput {
  type?: CustomerType;
  name: string;
  corporateName?: string;
  document?: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: CustomerAddress;
  contacts?: CustomerContact[];
  notes?: string;
  isActive?: boolean;
}

export interface CustomerUpdateInput {
  type?: CustomerType;
  name?: string;
  corporateName?: string;
  document?: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: CustomerAddress;
  contacts?: CustomerContact[];
  notes?: string;
  isActive?: boolean;
}

export interface CustomerFilterOptions {
  searchTerm?: string;
  isActive?: boolean;
  type?: CustomerType;
  page?: number;
  pageSize?: number;
}

export interface ICustomerRepository {
  list(tenantId: string, options?: CustomerFilterOptions): Promise<Customer[]>;
  getById(tenantId: string, id: string): Promise<Customer | null>;
  create(tenantId: string, data: CustomerCreateInput): Promise<{ success: boolean; customer?: Customer; error?: string }>;
  update(tenantId: string, id: string, data: CustomerUpdateInput): Promise<{ success: boolean; customer?: Customer; error?: string }>;
  toggleActive(tenantId: string, id: string): Promise<{ success: boolean; isActive?: boolean; error?: string }>;
  delete(tenantId: string, id: string): Promise<{ success: boolean; error?: string }>;
  search(tenantId: string, query: string): Promise<Customer[]>;
}

// In-Memory Fallback para testes e modo standalone
const inMemoryStore: Map<string, Customer[]> = new Map();

function mapRowToCustomer(row: any): Customer {
  return {
    id: row.id,
    tenantId: row.organization_id,
    type: row.type || 'company',
    name: row.name,
    corporateName: row.corporate_name || undefined,
    document: row.document || '',
    stateRegistration: row.state_registration || undefined,
    email: row.email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || undefined,
    address: row.address_json || undefined,
    contacts: [],
    notes: row.notes || undefined,
    isActive: Boolean(row.is_active),
    dataOrigin: 'user',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CustomerRepository implements ICustomerRepository {
  async list(tenantId: string, options?: CustomerFilterOptions): Promise<Customer[]> {
    if (!tenantId) return [];

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client indisponível no modo conectado.');

      let query = supabase
        .from('customers')
        .select('*')
        .eq('organization_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[CustomerRepository.list] Erro ao consultar Supabase:', error);
        throw new Error(error.message);
      }

      let customers = (data || []).map(mapRowToCustomer);

      if (options?.searchTerm && options.searchTerm.trim()) {
        const term = options.searchTerm.toLowerCase().trim();
        customers = customers.filter(
          c =>
            c.name.toLowerCase().includes(term) ||
            (c.corporateName && c.corporateName.toLowerCase().includes(term)) ||
            (c.document && c.document.includes(term))
        );
      }

      return customers;
    }

    // Modo Standalone / Testes In-Memory
    const list = inMemoryStore.get(tenantId) || [];
    let filtered = list.filter(c => !c.notes?.includes('__deleted__'));

    if (options?.isActive !== undefined) {
      filtered = filtered.filter(c => c.isActive === options.isActive);
    }
    if (options?.type) {
      filtered = filtered.filter(c => c.type === options.type);
    }
    if (options?.searchTerm && options.searchTerm.trim()) {
      const term = options.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(term) ||
          (c.corporateName && c.corporateName.toLowerCase().includes(term)) ||
          (c.document && c.document.includes(term))
      );
    }

    return filtered;
  }

  async getById(tenantId: string, id: string): Promise<Customer | null> {
    if (!tenantId || !id) return null;

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client indisponível.');

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapRowToCustomer(data) : null;
    }

    const list = inMemoryStore.get(tenantId) || [];
    return list.find(c => c.id === id) || null;
  }

  async create(
    tenantId: string,
    data: CustomerCreateInput
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    if (!tenantId) return { success: false, error: 'Tenant inválido.' };
    if (!data.name || !data.name.trim()) return { success: false, error: 'Nome do cliente é obrigatório.' };
    if (!isValidEmailFormat(data.email)) return { success: false, error: 'E-mail em formato inválido.' };

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload = {
        organization_id: tenantId,
        type: data.type || 'company',
        name: data.name.trim(),
        corporate_name: data.corporateName?.trim() || null,
        document: sanitizeDocument(data.document) || null,
        state_registration: data.stateRegistration?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        address_json: data.address || {},
        notes: data.notes?.trim() || null,
        is_active: data.isActive !== false,
      };

      const { data: inserted, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, customer: mapRowToCustomer(inserted) };
    }

    // Modo Standalone
    const list = inMemoryStore.get(tenantId) || [];
    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      type: data.type || 'company',
      name: data.name.trim(),
      corporateName: data.corporateName?.trim(),
      document: sanitizeDocument(data.document),
      stateRegistration: data.stateRegistration?.trim(),
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      whatsapp: data.whatsapp?.trim(),
      address: data.address,
      contacts: data.contacts || [],
      notes: data.notes?.trim(),
      isActive: data.isActive !== false,
      dataOrigin: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newCustomer);
    inMemoryStore.set(tenantId, list);
    return { success: true, customer: newCustomer };
  }

  async update(
    tenantId: string,
    id: string,
    data: CustomerUpdateInput
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    if (!tenantId || !id) return { success: false, error: 'Parâmetros inválidos.' };
    if (data.name !== undefined && !data.name.trim()) {
      return { success: false, error: 'Nome do cliente não pode ser vazio.' };
    }
    if (!isValidEmailFormat(data.email)) {
      return { success: false, error: 'E-mail em formato inválido.' };
    }

    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.corporateName !== undefined) payload.corporate_name = data.corporateName?.trim() || null;
      if (data.document !== undefined) payload.document = sanitizeDocument(data.document) || null;
      if (data.stateRegistration !== undefined) payload.state_registration = data.stateRegistration?.trim() || null;
      if (data.email !== undefined) payload.email = data.email?.trim() || null;
      if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
      if (data.whatsapp !== undefined) payload.whatsapp = data.whatsapp?.trim() || null;
      if (data.address !== undefined) payload.address_json = data.address;
      if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
      if (data.isActive !== undefined) payload.is_active = data.isActive;

      const { data: updated, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('organization_id', tenantId)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, customer: mapRowToCustomer(updated) };
    }

    const list = inMemoryStore.get(tenantId) || [];
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return { success: false, error: 'Cliente não encontrado.' };

    const current = list[idx];
    const updatedCustomer: Customer = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      corporateName: data.corporateName !== undefined ? data.corporateName?.trim() : current.corporateName,
      document: data.document !== undefined ? sanitizeDocument(data.document) : current.document,
      stateRegistration: data.stateRegistration !== undefined ? data.stateRegistration?.trim() : current.stateRegistration,
      email: data.email !== undefined ? data.email.trim() : current.email,
      phone: data.phone !== undefined ? data.phone.trim() : current.phone,
      whatsapp: data.whatsapp !== undefined ? data.whatsapp.trim() : current.whatsapp,
      address: data.address !== undefined ? data.address : current.address,
      notes: data.notes !== undefined ? data.notes.trim() : current.notes,
      isActive: data.isActive !== undefined ? data.isActive : current.isActive,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updatedCustomer;
    return { success: true, customer: updatedCustomer };
  }

  async toggleActive(tenantId: string, id: string): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
    const customer = await this.getById(tenantId, id);
    if (!customer) return { success: false, error: 'Cliente não encontrado.' };

    const res = await this.update(tenantId, id, { isActive: !customer.isActive });
    return { success: res.success, isActive: res.customer?.isActive, error: res.error };
  }

  async delete(tenantId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (isModeConnected && isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Supabase indisponível.' };

      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', tenantId)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const list = inMemoryStore.get(tenantId) || [];
    inMemoryStore.set(tenantId, list.filter(c => c.id !== id));
    return { success: true };
  }

  async search(tenantId: string, query: string): Promise<Customer[]> {
    return this.list(tenantId, { searchTerm: query });
  }

  // Utilitário exclusivo para testes
  _clearForTest(tenantId?: string) {
    if (tenantId) inMemoryStore.delete(tenantId);
    else inMemoryStore.clear();
  }
}

export const customerRepository = new CustomerRepository();
