/**
 * @file tenant.ts
 * @description Contratos de Domínio para Multi-Tenancy, Usuários, Permissões Granulares e Integrações
 * @project OrçaGraf
 * 
 * MODELO DE PERMISSÕES GRANULARES (Padrão Mubisys para Gráficas):
 * - Organizado por Módulo e Ação
 * - Perfis-base funcionam como modelos iniciais configuráveis
 * - Administradores podem personalizar a matriz de cada usuário individualmente
 * - Proteção estrita contra remoção do último administrador
 * - Isolamento multi-empresa rígido por tenantId
 * - Sem módulo financeiro (o financeiro reside exclusivamente no ArteFlow)
 */

export type PermissionModule =
  | 'general'                // Página Geral / Dashboard Comercial
  | 'quotes'                 // Orçamentos
  | 'customers'              // Clientes
  | 'products'               // Produtos e Insumos
  | 'settings'               // Configurações da gráfica
  | 'users_permissions'      // Usuários e permissões
  | 'integrations'           // Integrações (WhatsApp, etc.)
  | 'reports'                // Relatórios comerciais
  | 'arteflow_integration'   // Integração com ArteFlow
  | 'artecheck_integration'; // Integração com ArteCheck

export type PermissionAction =
  | 'view'             // Visualizar
  | 'create'           // Criar
  | 'edit'             // Editar
  | 'delete'           // Excluir
  | 'approve'          // Aprovar
  | 'cancel'           // Cancelar
  | 'export'           // Exportar / Baixar PDF
  | 'view_values'      // Visualizar valores e totais
  | 'apply_discount'   // Aplicar desconto comercial
  | 'change_status'    // Alterar status
  | 'send_whatsapp'    // Enviar pelo WhatsApp
  | 'view_reports';    // Visualizar relatórios comerciais

export type BaseProfile =
  | 'admin'       // Administrador
  | 'reception'   // Recepção / Balcão
  | 'sales'       // Comercial
  | 'production'  // Produção
  | 'manager'     // Gestor
  | 'custom';     // Personalizado

export type UserRole = 'owner' | 'admin' | 'sales' | 'reception' | 'production' | 'manager' | 'custom';

export type UserPermissions = Record<PermissionModule, PermissionAction[]>;

export interface PermissionAuditLog {
  id: string;
  tenantId: string;
  performedByUserId: string;
  performedByUserName: string;
  targetUserId: string;
  targetUserName: string;
  timestamp: string; // ISO 8601
  actionType: 'user_created' | 'user_updated' | 'permissions_updated' | 'user_deactivated' | 'user_activated' | 'session_terminated';
  description: string;
  details?: Record<string, any>;
}

export const MODULE_DEFINITIONS: Record<PermissionModule, { label: string; description: string; availableActions: PermissionAction[] }> = {
  general: {
    label: 'Página Geral',
    description: 'Dashboard principal com métricas comerciais e operacionais',
    availableActions: ['view', 'view_values', 'export'],
  },
  quotes: {
    label: 'Orçamentos',
    description: 'Elaboração, negociação, descontos, download de PDF e envio de propostas',
    availableActions: ['view', 'create', 'edit', 'delete', 'approve', 'cancel', 'export', 'view_values', 'apply_discount', 'change_status', 'send_whatsapp'],
  },
  customers: {
    label: 'Clientes',
    description: 'Cadastro e histórico de clientes e contatos',
    availableActions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  products: {
    label: 'Produtos e Insumos',
    description: 'Catálogo de materiais, acabamentos e produtos gráficos',
    availableActions: ['view', 'create', 'edit', 'delete', 'view_values', 'export'],
  },
  settings: {
    label: 'Configurações da Gráfica',
    description: 'Dados cadastrais da empresa, prazos padrão e personalização visual',
    availableActions: ['view', 'edit'],
  },
  users_permissions: {
    label: 'Usuários e Permissões',
    description: 'Gerenciamento de acessos, perfis-base e auditoria',
    availableActions: ['view', 'create', 'edit', 'delete'],
  },
  integrations: {
    label: 'Integrações',
    description: 'Configurações do WhatsApp da gráfica e conexões do ecossistema',
    availableActions: ['view', 'edit'],
  },
  reports: {
    label: 'Relatórios Comerciais',
    description: 'Relatórios autorizados de propostas, conversão e desempenho de vendas',
    availableActions: ['view', 'view_reports', 'export', 'view_values'],
  },
  arteflow_integration: {
    label: 'Integração com ArteFlow',
    description: 'Envio de evento QUOTE_APPROVED com dados comerciais para produção e PCP',
    availableActions: ['view', 'edit', 'export'],
  },
  artecheck_integration: {
    label: 'Integração com ArteCheck',
    description: 'Validação técnica de arquivos e pré-impressão',
    availableActions: ['view', 'edit'],
  },
};

export const ACTION_DEFINITIONS: Record<PermissionAction, { label: string; description: string }> = {
  view: { label: 'Visualizar', description: 'Acessar telas e consultar listagens' },
  create: { label: 'Criar', description: 'Incluir novos registros no sistema' },
  edit: { label: 'Editar', description: 'Modificar dados de registros existentes' },
  delete: { label: 'Excluir', description: 'Remover registros permanentemente' },
  approve: { label: 'Aprovar / Recusar', description: 'Aprovar ou recusar propostas formalmente' },
  cancel: { label: 'Cancelar', description: 'Cancelar propostas em andamento' },
  export: { label: 'Baixar PDF / Exportar', description: 'Gerar e baixar PDF do orçamento e relatórios' },
  view_values: { label: 'Visualizar valores', description: 'Visualizar preços de venda e subtotais' },
  apply_discount: { label: 'Aplicar desconto', description: 'Conceder descontos comerciais em propostas' },
  change_status: { label: 'Alterar status', description: 'Modificar status operacional de registros' },
  send_whatsapp: { label: 'Enviar WhatsApp', description: 'Disparar orçamento formatado e PDF para o cliente' },
  view_reports: { label: 'Visualizar relatórios', description: 'Acessar métricas e relatórios comerciais' },
};

// ==========================================
// PRESETS DOS PERFIS-BASE (SEM FINANCEIRO)
// ==========================================

export const ADMIN_PERMISSIONS: UserPermissions = {
  general: ['view', 'view_values', 'export'],
  quotes: ['view', 'create', 'edit', 'delete', 'approve', 'cancel', 'export', 'view_values', 'apply_discount', 'change_status', 'send_whatsapp'],
  customers: ['view', 'create', 'edit', 'delete', 'export'],
  products: ['view', 'create', 'edit', 'delete', 'view_values', 'export'],
  settings: ['view', 'edit'],
  users_permissions: ['view', 'create', 'edit', 'delete'],
  integrations: ['view', 'edit'],
  reports: ['view', 'view_reports', 'export', 'view_values'],
  arteflow_integration: ['view', 'edit', 'export'],
  artecheck_integration: ['view', 'edit'],
};

export const RECEPTION_PERMISSIONS: UserPermissions = {
  general: ['view'],
  quotes: ['view', 'create', 'edit', 'export', 'view_values', 'change_status', 'send_whatsapp'],
  customers: ['view', 'create', 'edit'],
  products: ['view', 'view_values'],
  settings: ['view'],
  users_permissions: [],
  integrations: ['view'],
  reports: [],
  arteflow_integration: ['view'],
  artecheck_integration: ['view'],
};

export const SALES_PERMISSIONS: UserPermissions = {
  general: ['view', 'view_values'],
  quotes: ['view', 'create', 'edit', 'approve', 'cancel', 'export', 'view_values', 'apply_discount', 'change_status', 'send_whatsapp'],
  customers: ['view', 'create', 'edit', 'export'],
  products: ['view', 'view_values'],
  settings: ['view'],
  users_permissions: [],
  integrations: ['view'],
  reports: ['view', 'view_reports'],
  arteflow_integration: ['view'],
  artecheck_integration: ['view'],
};

export const PRODUCTION_PERMISSIONS: UserPermissions = {
  general: ['view'],
  quotes: ['view', 'export'],
  customers: ['view'],
  products: ['view'],
  settings: [],
  users_permissions: [],
  integrations: [],
  reports: [],
  arteflow_integration: ['view', 'edit'],
  artecheck_integration: ['view', 'edit'],
};

export const MANAGER_PERMISSIONS: UserPermissions = {
  general: ['view', 'view_values', 'export'],
  quotes: ['view', 'create', 'edit', 'approve', 'cancel', 'export', 'view_values', 'apply_discount', 'change_status', 'send_whatsapp'],
  customers: ['view', 'create', 'edit', 'export'],
  products: ['view', 'create', 'edit', 'view_values', 'export'],
  settings: ['view'],
  users_permissions: ['view'],
  integrations: ['view', 'edit'],
  reports: ['view', 'view_reports', 'export', 'view_values'],
  arteflow_integration: ['view', 'export'],
  artecheck_integration: ['view'],
};

export function getDefaultPermissionsForProfile(profile: BaseProfile): UserPermissions {
  switch (profile) {
    case 'admin':
      return JSON.parse(JSON.stringify(ADMIN_PERMISSIONS));
    case 'reception':
      return JSON.parse(JSON.stringify(RECEPTION_PERMISSIONS));
    case 'sales':
      return JSON.parse(JSON.stringify(SALES_PERMISSIONS));
    case 'production':
      return JSON.parse(JSON.stringify(PRODUCTION_PERMISSIONS));
    case 'manager':
      return JSON.parse(JSON.stringify(MANAGER_PERMISSIONS));
    case 'custom':
    default:
      return JSON.parse(JSON.stringify(RECEPTION_PERMISSIONS));
  }
}

// ==========================================
// FUNÇÕES DE VERIFICAÇÃO DE SEGURANÇA (RBAC)
// ==========================================

export function hasUserPermission(
  user: User | null | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!user || !user.isActive || user.isLocked) {
    return false;
  }
  // Administradores e donos possuem acesso pleno
  if (user.baseProfile === 'admin' || user.role === 'owner' || user.role === 'admin') {
    if (user.permissions && user.permissions[module]) {
      return user.permissions[module].includes(action);
    }
    return ADMIN_PERMISSIONS[module]?.includes(action) ?? false;
  }

  const modulePerms = user.permissions?.[module];
  if (!modulePerms || !Array.isArray(modulePerms)) {
    return false;
  }
  return modulePerms.includes(action);
}

export function canManageQuotes(userOrRole: User | UserRole): boolean {
  if (typeof userOrRole === 'string') {
    return userOrRole === 'owner' || userOrRole === 'admin' || userOrRole === 'sales' || userOrRole === 'reception' || userOrRole === 'manager';
  }
  return hasUserPermission(userOrRole, 'quotes', 'create') || hasUserPermission(userOrRole, 'quotes', 'edit');
}

export function canApplyDiscounts(userOrRole: User | UserRole): boolean {
  if (typeof userOrRole === 'string') {
    return userOrRole === 'owner' || userOrRole === 'admin' || userOrRole === 'sales' || userOrRole === 'manager';
  }
  return hasUserPermission(userOrRole, 'quotes', 'apply_discount');
}

export function canDownloadQuotePdf(userOrRole: User | UserRole): boolean {
  if (typeof userOrRole === 'string') {
    return true;
  }
  return hasUserPermission(userOrRole, 'quotes', 'export');
}

export function canSendQuoteWhatsApp(userOrRole: User | UserRole): boolean {
  if (typeof userOrRole === 'string') {
    return true;
  }
  return hasUserPermission(userOrRole, 'quotes', 'send_whatsapp');
}

// ==========================================
// ESTRUTURAS DE EMPRESA E INTEGRAÇÕES
// ==========================================

export type WhatsAppStatus = 'not_configured' | 'connecting' | 'connected' | 'error';
export type WhatsAppSendMode = 'automatic' | 'with_confirmation';

export interface WhatsAppPreferences {
  allowQuotePdfReport: boolean; // Opção de permitir o envio do relatório do orçamento em PDF
  attachPdf: boolean;
  notifyOnApproved: boolean;
  notifyArteFlowUpdates: boolean; // Opção de compartilhar a integração com o ArteFlow (avisos de pedidos e produção)
  sendMode: WhatsAppSendMode;
}

export interface WhatsAppIntegration {
  status: WhatsAppStatus;
  phoneNumber?: string;
  accountName?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  apiVersion?: string;
  lastSyncAt?: string;
  errorMessage?: string;
  preferences: WhatsAppPreferences;
}

export interface CompanyBranding {
  logoUrl?: string;
  primaryColor: string; // Cor principal (#2563eb)
  secondaryColor?: string; // Cor de suporte (#0d9488)
  accentColor?: string;
  showLogoInQuotes: boolean;
}

export interface QuoteCustomization {
  headerNote?: string;
  footerDisclaimer?: string;
  defaultPaymentTerms: string;
  defaultProductionDays: number;
  commercialNotes?: string;
  showTechnicalDetailsToCustomer: boolean;
}

export interface CompanyAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Company {
  id: string; // tenantId
  tradeName: string; // Nome fantasia
  corporateName: string; // Razão social
  document: string; // CNPJ ou CPF formatado
  stateRegistration?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  managerName: string;
  address: CompanyAddress;
  branding: CompanyBranding;
  customization: QuoteCustomization;
  whatsappConfig?: WhatsAppIntegration;
  settings: {
    currency: string; // 'BRL'
  };
  dataOrigin?: 'demo' | 'user';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface User {
  id: string;
  tenantId: string; // Isolamento multiempresa obrigatório
  name: string;
  email: string;
  role: UserRole;
  baseProfile: BaseProfile;
  permissions: UserPermissions;
  avatarUrl?: string; // Foto de perfil do usuário (Base64 ou URL segura)
  isActive: boolean;
  isLocked?: boolean;
  dataOrigin?: 'demo' | 'user';
  lastLoginAt?: string;
  sessionTerminatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionContextState {
  tenantId: string;
  currentCompany: Company;
  currentUser: User;
  availableCompanies: Company[];
  isAuthenticated: boolean;
}
