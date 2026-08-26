/**
 * @file customer.ts
 * @description Contratos de Domínio para Clientes e Contatos Comerciais
 * @project OrçaGraf - Etapa 1 Fundação
 */

export type CustomerType = 'person' | 'company'; // Pessoa Física ou Jurídica

export interface CustomerAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CustomerContact {
  id: string;
  name: string;
  role?: string; // ex: "Comprador", "Designer", "Financeiro"
  email?: string;
  phone?: string;
  whatsapp?: string;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  tenantId: string; // Isolamento multiempresa obrigatório
  type: CustomerType;
  name: string; // Nome fantasia ou Nome Completo
  corporateName?: string; // Razão Social (se PJ)
  document: string; // CPF ou CNPJ
  stateRegistration?: string; // Inscrição Estadual (se PJ)
  email: string;
  phone: string;
  whatsapp?: string;
  contacts: CustomerContact[];
  address?: CustomerAddress;
  notes?: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
