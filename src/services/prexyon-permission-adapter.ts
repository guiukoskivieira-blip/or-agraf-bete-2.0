/**
 * @file prexyon-permission-adapter.ts
 * @description Adaptador Canônico Central de Permissões: Prexyon (Dot-Notation) -> OrçaGraf (RBAC Modular)
 * @project OrçaGraf
 * 
 * POLÍTICA DE SEGURANÇA:
 * - DEFAULT DENY: Permissões não reconhecidas são sumariamente ignoradas/negadas.
 * - OWNER: Preserva bypass canônico se membership real for role = 'owner'.
 * - MEMBER: Recebe estritamente as permissões traduzidas.
 */

import {
  UserPermissions,
  PermissionModule,
  PermissionAction,
  ADMIN_PERMISSIONS,
  UserRole,
} from '../types/tenant';

/**
 * Mapeamento Canônico de Permissões Prexyon -> Módulo e Ação Internos do OrçaGraf
 */
export const PREXYON_TO_ORCAGRAF_PERMISSION_MAP: Record<string, { module: PermissionModule; action: PermissionAction }[]> = {
  // ACESSO GERAL
  'orcagraf.view': [
    { module: 'general', action: 'view' },
    { module: 'general', action: 'view_values' },
  ],

  // ORÇAMENTOS
  'orcagraf.quotes.view': [
    { module: 'quotes', action: 'view' },
    { module: 'quotes', action: 'view_values' },
    { module: 'quotes', action: 'export' }, // Permite gerar/baixar PDF de orçamentos autorizados
  ],
  'orcagraf.quotes.create': [
    { module: 'quotes', action: 'create' },
  ],
  'orcagraf.quotes.edit': [
    { module: 'quotes', action: 'edit' },
  ],
  'orcagraf.quotes.approve': [
    { module: 'quotes', action: 'approve' },
  ],
  'orcagraf.quotes.delete': [
    { module: 'quotes', action: 'delete' },
  ],
  'orcagraf.quotes.discount': [
    { module: 'quotes', action: 'apply_discount' },
  ],

  // CLIENTES
  'orcagraf.customers.view': [
    { module: 'customers', action: 'view' },
  ],
  'orcagraf.customers.create': [
    { module: 'customers', action: 'create' },
  ],
  'orcagraf.customers.edit': [
    { module: 'customers', action: 'edit' },
  ],
  'orcagraf.customers.delete': [
    { module: 'customers', action: 'delete' },
  ],
  // Legado retrocompatível de clientes
  'orcagraf.customers.manage': [
    { module: 'customers', action: 'view' },
    { module: 'customers', action: 'create' },
    { module: 'customers', action: 'edit' },
    { module: 'customers', action: 'delete' },
  ],

  // CATÁLOGO / PRECIFICAÇÃO
  'orcagraf.pricing.view': [
    { module: 'products', action: 'view' },
    { module: 'products', action: 'view_values' },
  ],
  'orcagraf.products.view': [
    { module: 'products', action: 'view' },
    { module: 'products', action: 'view_values' },
  ],
  'orcagraf.pricing.manage': [
    { module: 'products', action: 'create' },
    { module: 'products', action: 'edit' },
    { module: 'products', action: 'delete' },
    { module: 'products', action: 'view_values' },
  ],

  // ADMINISTRAÇÃO
  'orcagraf.users.manage': [
    { module: 'users_permissions', action: 'view' },
    { module: 'users_permissions', action: 'create' },
    { module: 'users_permissions', action: 'edit' },
    { module: 'users_permissions', action: 'delete' },
  ],
  'orcagraf.settings.manage': [
    { module: 'settings', action: 'view' },
    { module: 'settings', action: 'edit' },
  ],
  'orcagraf.integrations.manage': [
    { module: 'integrations', action: 'view' },
    { module: 'integrations', action: 'edit' },
  ],
};

/**
 * Cria uma estrutura de permissões vazia (Default Deny)
 */
export function createEmptyPermissions(): UserPermissions {
  return {
    general: [],
    quotes: [],
    customers: [],
    products: [],
    settings: [],
    users_permissions: [],
    integrations: [],
    reports: [],
    arteflow_integration: [],
    artecheck_integration: [],
  };
}

/**
 * Adapta uma lista de permissões recebidas da Prexyon (ou do banco de dados) para a matriz interna do OrçaGraf.
 *
 * @param rawPermissions Pode ser:
 *  - Array de strings dot-notation: ["orcagraf.view", "orcagraf.quotes.view", "orcagraf.quotes.create"]
 *  - Objeto JSON modular existente: { quotes: ["view", "create"] }
 *  - Null/undefined
 * @param role Papel autoritativo do usuário ('owner' | 'admin' | 'member' | etc.)
 */
export function adaptPrexyonPermissions(
  rawPermissions: unknown,
  role?: string
): UserPermissions {
  // 1. OWNER possui bypass total canônico
  if (role === 'owner') {
    return JSON.parse(JSON.stringify(ADMIN_PERMISSIONS));
  }

  // 2. ADMIN possui permissões administrativas completas
  if (role === 'admin') {
    return JSON.parse(JSON.stringify(ADMIN_PERMISSIONS));
  }

  // 3. Inicializa com Default Deny
  const permissions = createEmptyPermissions();

  if (!rawPermissions) {
    return permissions;
  }

  // 4. Se for Array de Strings (Padrão Prexyon Dot-Notation)
  if (Array.isArray(rawPermissions)) {
    for (const grant of rawPermissions) {
      if (typeof grant !== 'string') continue;
      const cleanGrant = grant.trim().toLowerCase();

      const mappings = PREXYON_TO_ORCAGRAF_PERMISSION_MAP[cleanGrant];
      if (mappings && Array.isArray(mappings)) {
        for (const mapping of mappings) {
          if (!permissions[mapping.module].includes(mapping.action)) {
            permissions[mapping.module].push(mapping.action);
          }
        }
      }
      // Qualquer permissão desconhecida é sumariamente ignorada (Default Deny)
    }
    return permissions;
  }

  // 5. Se for Objeto Modular (Formato legado ou customizado no banco de dados)
  if (typeof rawPermissions === 'object' && rawPermissions !== null) {
    const rawObj = rawPermissions as Record<string, unknown>;
    for (const [mod, actions] of Object.entries(rawObj)) {
      if (mod in permissions && Array.isArray(actions)) {
        const validModule = mod as PermissionModule;
        for (const act of actions) {
          if (typeof act === 'string' && !permissions[validModule].includes(act as PermissionAction)) {
            permissions[validModule].push(act as PermissionAction);
          }
        }
      }
    }
    return permissions;
  }

  return permissions;
}

/**
 * Valida se um usuário com permissões e role possui autorização para uma rota ou ação sensível.
 */
export function isActionAuthorized(
  permissions: UserPermissions,
  role: string | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (role === 'owner' || role === 'admin') {
    return true;
  }
  const modulePerms = permissions[module];
  if (!modulePerms || !Array.isArray(modulePerms)) {
    return false;
  }
  return modulePerms.includes(action);
}
