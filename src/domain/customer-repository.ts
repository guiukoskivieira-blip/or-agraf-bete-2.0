/**
 * @file customer-repository.ts
 * @description Repositório Isolado de Clientes Multi-tenant para OrçaGraf Standalone
 * @project OrçaGraf
 * 
 * DIRETRIZES:
 * 1. Interface desacoplada (ICustomerRepository) permitindo futura substituição por backend Prexyon.
 * 2. Persistência local isolada por tenant (localStorage com fallback em memória).
 * 3. Validações de domínio:
 *    - Nome obrigatório.
 *    - Documento (CPF/CNPJ) sem duplicidade no mesmo tenant (se informado).
 *    - Mesmo documento permitido em tenants diferentes (isolamento multiempresa).
 *    - E-mail com formato válido (se informado).
 *    - Telefone normalizado (se informado).
 *    - Ativação/desativação não destrutiva.
 */

import { Customer, CustomerType, CustomerAddress, CustomerContact } from '../types/customer';

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
  search(tenantId: string, query: string): Promise<Customer[]>;
}

// Utilitários de Normalização e Validação
export function sanitizeDocument(doc?: string): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

export function isValidEmailFormat(email?: string): boolean {
  if (!email || !email.trim()) return true; // Opcional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.trim();
}

export function getInitialCustomersTemplate(tenantId: string): Customer[] {
  const timestamp = '2026-02-15T09:00:00.000Z';

  if (tenantId === 'emp_alphaprint_01') {
    return [
      {
        id: 'cust_01',
        tenantId: 'emp_alphaprint_01',
        type: 'company',
        name: 'Alfa Engenharia & Construções',
        corporateName: 'Alfa Engenharia e Construções Civis Ltda',
        document: '11.222.333/0001-44',
        stateRegistration: '111.222.333.444',
        email: 'compras@alfaengenharia.com.br',
        phone: '(11) 98765-4321',
        whatsapp: '(11) 98765-4321',
        contacts: [
          {
            id: 'cont_01',
            name: 'Eng. Marcelo Albuquerque',
            role: 'Diretor de Obras',
            email: 'marcelo@alfaengenharia.com.br',
            phone: '(11) 98765-4321',
            isPrimary: true,
          },
        ],
        address: {
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Conj. 1201',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
        notes: 'Cliente corporativo com faturamento mensal.',
        isActive: true,
        dataOrigin: 'demo',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'cust_02',
        tenantId: 'emp_alphaprint_01',
        type: 'company',
        name: 'Studio Beleza & Estética',
        corporateName: 'Studio Beleza Cuidados Pessoais Ltda',
        document: '22.333.444/0001-55',
        email: 'contato@studiobeleza.com.br',
        phone: '(11) 97777-8888',
        whatsapp: '(11) 97777-8888',
        contacts: [
          {
            id: 'cont_02',
            name: 'Fernanda Martins',
            role: 'Proprietária',
            email: 'fernanda@studiobeleza.com.br',
            phone: '(11) 97777-8888',
            isPrimary: true,
          },
        ],
        address: {
          street: 'Rua Augusta',
          number: '550',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01305-000',
        },
        notes: 'Material promocional e cartões frequentes.',
        isActive: true,
        dataOrigin: 'demo',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
  }

  return [];
}

/**
 * Implementação em LocalStorage com Isolamento Estrito por Tenant
 * e Fallback em Memória para Testes/Node
 */
export class LocalStorageCustomerRepository implements ICustomerRepository {
  private inMemoryStorage: Map<string, Customer[]> = new Map();

  private getStorageKey(tenantId: string): string {
    return `orcagraf_customers_${tenantId}`;
  }

  private isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private getTenantCustomers(tenantId: string): Customer[] {
    if (this.isLocalStorageAvailable()) {
      try {
        const raw = window.localStorage.getItem(this.getStorageKey(tenantId));
        if (raw) {
          return JSON.parse(raw) as Customer[];
        }
      } catch (err) {
        console.warn('Erro ao ler localStorage, utilizando fallback em memória:', err);
      }
    }

    // Memória
    if (!this.inMemoryStorage.has(tenantId)) {
      const initial = getInitialCustomersTemplate(tenantId);
      this.inMemoryStorage.set(tenantId, initial);
      if (this.isLocalStorageAvailable()) {
        try {
          window.localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(initial));
        } catch {
          // Ignore
        }
      }
    }

    return this.inMemoryStorage.get(tenantId) || [];
  }

  private saveTenantCustomers(tenantId: string, customers: Customer[]): void {
    this.inMemoryStorage.set(tenantId, customers);

    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(customers));
      } catch (err) {
        console.warn('Erro ao gravar no localStorage:', err);
      }
    }
  }

  public async list(tenantId: string, options?: CustomerFilterOptions): Promise<Customer[]> {
    if (!tenantId) return [];

    let list = [...this.getTenantCustomers(tenantId)];

    if (options?.isActive !== undefined) {
      list = list.filter(c => c.isActive === options.isActive);
    }

    if (options?.type) {
      list = list.filter(c => c.type === options.type);
    }

    if (options?.searchTerm?.trim()) {
      const term = options.searchTerm.trim().toLowerCase();
      const termCleanDoc = sanitizeDocument(term);

      list = list.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(term);
        const corpMatch = (c.corporateName || '').toLowerCase().includes(term);
        const emailMatch = (c.email || '').toLowerCase().includes(term);
        const phoneMatch = (c.phone || '').includes(term) || (c.whatsapp || '').includes(term);
        const cityMatch = (c.address?.city || '').toLowerCase().includes(term);
        const docClean = sanitizeDocument(c.document);
        const docMatch = (c.document || '').includes(term) || (termCleanDoc && docClean.includes(termCleanDoc));

        return nameMatch || corpMatch || emailMatch || phoneMatch || cityMatch || Boolean(docMatch);
      });
    }

    return list;
  }

  public async getById(tenantId: string, id: string): Promise<Customer | null> {
    if (!tenantId || !id) return null;
    const list = this.getTenantCustomers(tenantId);
    return list.find(c => c.id === id && c.tenantId === tenantId) || null;
  }

  public async create(
    tenantId: string,
    data: CustomerCreateInput
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    if (!tenantId) {
      return { success: false, error: 'Identificador de empresa obrigatório.' };
    }

    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'O nome ou razão social do cliente é obrigatório.' };
    }

    const trimmedEmail = (data.email || '').trim();
    if (trimmedEmail && !isValidEmailFormat(trimmedEmail)) {
      return { success: false, error: 'O formato do e-mail informado é inválido.' };
    }

    const cleanDoc = sanitizeDocument(data.document);
    const existingList = this.getTenantCustomers(tenantId);

    // Validação de duplicidade de documento no mesmo tenant (se preenchido)
    if (cleanDoc) {
      const duplicate = existingList.find(c => sanitizeDocument(c.document) === cleanDoc);
      if (duplicate) {
        return {
          success: false,
          error: `Já existe um cliente cadastrado nesta empresa com este CPF/CNPJ (${duplicate.name}).`,
        };
      }
    }

    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      type: data.type || (cleanDoc.length > 11 ? 'company' : 'person'),
      name: trimmedName,
      corporateName: (data.corporateName || '').trim() || undefined,
      document: (data.document || '').trim(),
      stateRegistration: (data.stateRegistration || '').trim() || undefined,
      email: trimmedEmail,
      phone: normalizePhoneNumber(data.phone),
      whatsapp: normalizePhoneNumber(data.whatsapp || data.phone),
      contacts: data.contacts || [],
      address: data.address,
      notes: (data.notes || '').trim() || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
      dataOrigin: (data as any).dataOrigin || 'user',
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [newCustomer, ...existingList];
    this.saveTenantCustomers(tenantId, updatedList);

    return { success: true, customer: newCustomer };
  }

  public async update(
    tenantId: string,
    id: string,
    data: CustomerUpdateInput
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    if (!tenantId || !id) {
      return { success: false, error: 'Identificadores obrigatórios.' };
    }

    const existingList = this.getTenantCustomers(tenantId);
    const existing = existingList.find(c => c.id === id && c.tenantId === tenantId);
    if (!existing) {
      return { success: false, error: 'Cliente não encontrado para esta empresa.' };
    }

    if (data.name !== undefined && !data.name.trim()) {
      return { success: false, error: 'O nome do cliente não pode ficar vazio.' };
    }

    if (data.email !== undefined && data.email.trim() && !isValidEmailFormat(data.email)) {
      return { success: false, error: 'O formato do e-mail informado é inválido.' };
    }

    // Se o documento foi alterado, checa se não duplica com outro cliente do mesmo tenant
    if (data.document !== undefined) {
      const cleanNewDoc = sanitizeDocument(data.document);
      if (cleanNewDoc) {
        const duplicate = existingList.find(
          c => c.id !== id && sanitizeDocument(c.document) === cleanNewDoc
        );
        if (duplicate) {
          return {
            success: false,
            error: `Outro cliente já possui este CPF/CNPJ (${duplicate.name}).`,
          };
        }
      }
    }

    const now = new Date().toISOString();
    const updatedCustomer: Customer = {
      ...existing,
      type: data.type !== undefined ? data.type : existing.type,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      corporateName: data.corporateName !== undefined ? data.corporateName.trim() || undefined : existing.corporateName,
      document: data.document !== undefined ? data.document.trim() : existing.document,
      stateRegistration: data.stateRegistration !== undefined ? data.stateRegistration.trim() || undefined : existing.stateRegistration,
      email: data.email !== undefined ? data.email.trim() : existing.email,
      phone: data.phone !== undefined ? normalizePhoneNumber(data.phone) : existing.phone,
      whatsapp: data.whatsapp !== undefined ? normalizePhoneNumber(data.whatsapp) : existing.whatsapp,
      address: data.address !== undefined ? data.address : existing.address,
      contacts: data.contacts !== undefined ? data.contacts : existing.contacts,
      notes: data.notes !== undefined ? data.notes.trim() || undefined : existing.notes,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      updatedAt: now,
    };

    const updatedList = existingList.map(c => (c.id === id ? updatedCustomer : c));
    this.saveTenantCustomers(tenantId, updatedList);

    return { success: true, customer: updatedCustomer };
  }

  public async toggleActive(
    tenantId: string,
    id: string
  ): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
    if (!tenantId || !id) {
      return { success: false, error: 'Identificadores obrigatórios.' };
    }

    const existingList = this.getTenantCustomers(tenantId);
    const existing = existingList.find(c => c.id === id && c.tenantId === tenantId);
    if (!existing) {
      return { success: false, error: 'Cliente não encontrado.' };
    }

    const nextState = !existing.isActive;
    const now = new Date().toISOString();
    const updated = { ...existing, isActive: nextState, updatedAt: now };

    const updatedList = existingList.map(c => (c.id === id ? updated : c));
    this.saveTenantCustomers(tenantId, updatedList);

    return { success: true, isActive: nextState };
  }

  public async search(tenantId: string, query: string): Promise<Customer[]> {
    return this.list(tenantId, { searchTerm: query });
  }

  // Método auxiliar para testes para limpar dados em memória/storage
  public clear(tenantId?: string): void {
    if (tenantId) {
      this.inMemoryStorage.delete(tenantId);
      if (this.isLocalStorageAvailable()) {
        try {
          window.localStorage.removeItem(this.getStorageKey(tenantId));
        } catch {
          // Ignore
        }
      }
    } else {
      this.inMemoryStorage.clear();
    }
  }
}

// Instância singleton padrão do repositório
export const customerRepository = new LocalStorageCustomerRepository();
