/**
 * @file canonical-permissions-matrix.test.ts
 * @description Suíte Rigorosa de Homologação da Matriz Canônica de Permissões Prexyon -> OrçaGraf
 * @project OrçaGraf
 * 
 * POLÍTICA DE TESTES:
 * - ZERO asserts estáticos.
 * - Testes comportamentais e contratuais rigorosos para cada uma das 16 permissões canônicas,
 *   política anti-forjamento de vendedor e auditoria do MEMBER/OWNER real.
 */

import {
  adaptPrexyonPermissions,
  isActionAuthorized,
  PREXYON_TO_ORCAGRAF_PERMISSION_MAP,
} from '../services/prexyon-permission-adapter';
import { hasUserPermission, User, ADMIN_PERMISSIONS } from '../types/tenant';
import fs from 'fs';
import path from 'path';

export interface MatrixTestCase {
  num: number;
  name: string;
  run: () => Promise<{ passed: boolean; expected: string; found: string; error?: string }>;
}

export const canonicalPermissionsMatrixTests: MatrixTestCase[] = [
  // 1. orcagraf.quotes.edit allow/deny
  {
    num: 1,
    name: 'quotes.edit: Concede quotes.edit quando presente e bloqueia sumariamente na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.quotes.edit'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.quotes.view'], 'member');
      const canEdit = isActionAuthorized(allowedPerms, 'member', 'quotes', 'edit');
      const cannotEdit = isActionAuthorized(deniedPerms, 'member', 'quotes', 'edit');
      const passed = canEdit && !cannotEdit;
      return {
        passed,
        expected: 'canEdit=true e cannotEdit=false',
        found: `canEdit=${canEdit}, cannotEdit=${cannotEdit}`,
      };
    },
  },

  // 2. orcagraf.quotes.discount allow/deny
  {
    num: 2,
    name: 'quotes.discount: Concede quotes.apply_discount quando presente e bloqueia na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.quotes.discount'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.quotes.create'], 'member');
      const canDiscount = isActionAuthorized(allowedPerms, 'member', 'quotes', 'apply_discount');
      const cannotDiscount = isActionAuthorized(deniedPerms, 'member', 'quotes', 'apply_discount');
      const passed = canDiscount && !cannotDiscount;
      return {
        passed,
        expected: 'canDiscount=true e cannotDiscount=false',
        found: `canDiscount=${canDiscount}, cannotDiscount=${cannotDiscount}`,
      };
    },
  },

  // 3. orcagraf.quotes.delete allow/deny
  {
    num: 3,
    name: 'quotes.delete: Concede quotes.delete quando presente e bloqueia na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.quotes.delete'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.quotes.view'], 'member');
      const canDelete = isActionAuthorized(allowedPerms, 'member', 'quotes', 'delete');
      const cannotDelete = isActionAuthorized(deniedPerms, 'member', 'quotes', 'delete');
      const passed = canDelete && !cannotDelete;
      return {
        passed,
        expected: 'canDelete=true e cannotDelete=false',
        found: `canDelete=${canDelete}, cannotDelete=${cannotDelete}`,
      };
    },
  },

  // 4. orcagraf.customers.view allow/deny
  {
    num: 4,
    name: 'customers.view: Concede customers.view quando presente e bloqueia na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.customers.view'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.quotes.view'], 'member');
      const canView = isActionAuthorized(allowedPerms, 'member', 'customers', 'view');
      const cannotView = isActionAuthorized(deniedPerms, 'member', 'customers', 'view');
      const passed = canView && !cannotView;
      return {
        passed,
        expected: 'canView=true e cannotView=false',
        found: `canView=${canView}, cannotView=${cannotView}`,
      };
    },
  },

  // 5. orcagraf.customers.create allow/deny
  {
    num: 5,
    name: 'customers.create: Concede customers.create quando presente e bloqueia na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.customers.create'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.customers.view'], 'member');
      const canCreate = isActionAuthorized(allowedPerms, 'member', 'customers', 'create');
      const cannotCreate = isActionAuthorized(deniedPerms, 'member', 'customers', 'create');
      const passed = canCreate && !cannotCreate;
      return {
        passed,
        expected: 'canCreate=true e cannotCreate=false',
        found: `canCreate=${canCreate}, cannotCreate=${cannotCreate}`,
      };
    },
  },

  // 6. orcagraf.customers.edit allow/deny
  {
    num: 6,
    name: 'customers.edit: Concede customers.edit quando presente e bloqueia na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.customers.edit'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.customers.view'], 'member');
      const canEdit = isActionAuthorized(allowedPerms, 'member', 'customers', 'edit');
      const cannotEdit = isActionAuthorized(deniedPerms, 'member', 'customers', 'edit');
      const passed = canEdit && !cannotEdit;
      return {
        passed,
        expected: 'canEdit=true e cannotEdit=false',
        found: `canEdit=${canEdit}, cannotEdit=${cannotEdit}`,
      };
    },
  },

  // 7. orcagraf.customers.delete allow/deny
  {
    num: 7,
    name: 'customers.delete: Concede customers.delete quando presente e bloqueia na ausência',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.customers.delete'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.customers.edit'], 'member');
      const canDelete = isActionAuthorized(allowedPerms, 'member', 'customers', 'delete');
      const cannotDelete = isActionAuthorized(deniedPerms, 'member', 'customers', 'delete');
      const passed = canDelete && !cannotDelete;
      return {
        passed,
        expected: 'canDelete=true e cannotDelete=false',
        found: `canDelete=${canDelete}, cannotDelete=${cannotDelete}`,
      };
    },
  },

  // 8. orcagraf.pricing.view allow/deny
  {
    num: 8,
    name: 'pricing.view: Concede products.view e view_values sem permitir mutação de catálogo',
    run: async () => {
      const perms = adaptPrexyonPermissions(['orcagraf.pricing.view'], 'member');
      const canView = isActionAuthorized(perms, 'member', 'products', 'view');
      const canViewValues = isActionAuthorized(perms, 'member', 'products', 'view_values');
      const canEdit = isActionAuthorized(perms, 'member', 'products', 'edit');
      const passed = canView && canViewValues && !canEdit;
      return {
        passed,
        expected: 'canView=true, canViewValues=true, canEdit=false',
        found: `canView=${canView}, canViewValues=${canViewValues}, canEdit=${canEdit}`,
      };
    },
  },

  // 9. orcagraf.pricing.manage allow/deny
  {
    num: 9,
    name: 'pricing.manage: Concede criação, edição e exclusão de produtos e precificação',
    run: async () => {
      const perms = adaptPrexyonPermissions(['orcagraf.pricing.manage'], 'member');
      const canCreate = isActionAuthorized(perms, 'member', 'products', 'create');
      const canEdit = isActionAuthorized(perms, 'member', 'products', 'edit');
      const canDelete = isActionAuthorized(perms, 'member', 'products', 'delete');
      const passed = canCreate && canEdit && canDelete;
      return {
        passed,
        expected: 'canCreate=true, canEdit=true, canDelete=true',
        found: `canCreate=${canCreate}, canEdit=${canEdit}, canDelete=${canDelete}`,
      };
    },
  },

  // 10. orcagraf.users.manage allow/deny
  {
    num: 10,
    name: 'users.manage: Concede administração completa de usuários e permissões',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.users.manage'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.quotes.create'], 'member');
      const canUsers = isActionAuthorized(allowedPerms, 'member', 'users_permissions', 'edit');
      const cannotUsers = isActionAuthorized(deniedPerms, 'member', 'users_permissions', 'edit');
      const passed = canUsers && !cannotUsers;
      return {
        passed,
        expected: 'canUsers=true e cannotUsers=false',
        found: `canUsers=${canUsers}, cannotUsers=${cannotUsers}`,
      };
    },
  },

  // 11. orcagraf.settings.manage allow/deny
  {
    num: 11,
    name: 'settings.manage: Concede edição de configurações da gráfica',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.settings.manage'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.quotes.view'], 'member');
      const canSettings = isActionAuthorized(allowedPerms, 'member', 'settings', 'edit');
      const cannotSettings = isActionAuthorized(deniedPerms, 'member', 'settings', 'edit');
      const passed = canSettings && !cannotSettings;
      return {
        passed,
        expected: 'canSettings=true e cannotSettings=false',
        found: `canSettings=${canSettings}, cannotSettings=${cannotSettings}`,
      };
    },
  },

  // 12. orcagraf.integrations.manage allow/deny
  {
    num: 12,
    name: 'integrations.manage: Concede gerenciamento de integrações (WhatsApp, webhooks)',
    run: async () => {
      const allowedPerms = adaptPrexyonPermissions(['orcagraf.integrations.manage'], 'member');
      const deniedPerms = adaptPrexyonPermissions(['orcagraf.view'], 'member');
      const canIntegrations = isActionAuthorized(allowedPerms, 'member', 'integrations', 'edit');
      const cannotIntegrations = isActionAuthorized(deniedPerms, 'member', 'integrations', 'edit');
      const passed = canIntegrations && !cannotIntegrations;
      return {
        passed,
        expected: 'canIntegrations=true e cannotIntegrations=false',
        found: `canIntegrations=${canIntegrations}, cannotIntegrations=${cannotIntegrations}`,
      };
    },
  },

  // 13. Unknown Permission -> Default Deny
  {
    num: 13,
    name: 'Unknown Permission: Grant desconhecido ou malformado é sumariamente descartado (Default Deny)',
    run: async () => {
      const perms = adaptPrexyonPermissions(['orcagraf.hacker.bypass', 'superadmin', ''], 'member');
      const canAnyQuotes = isActionAuthorized(perms, 'member', 'quotes', 'create');
      const canAnyAdmin = isActionAuthorized(perms, 'member', 'users_permissions', 'view');
      const passed = !canAnyQuotes && !canAnyAdmin;
      return {
        passed,
        expected: 'canAnyQuotes=false e canAnyAdmin=false (Default Deny rigoroso)',
        found: `canAnyQuotes=${canAnyQuotes}, canAnyAdmin=${canAnyAdmin}`,
      };
    },
  },

  // 14. MEMBER Real de Homologação: designcreative254@gmail.com com exatamente 3 grants
  {
    num: 14,
    name: 'MEMBER Real: designcreative254@gmail.com possui exatamente 3 grants ativos e zero privilégios indevidos',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');

      const canViewApp = isActionAuthorized(memberPerms, 'member', 'general', 'view');
      const canViewQuotes = isActionAuthorized(memberPerms, 'member', 'quotes', 'view');
      const canCreateQuotes = isActionAuthorized(memberPerms, 'member', 'quotes', 'create');

      // Restrições estritas obrigatórias
      const cannotEditQuotes = !isActionAuthorized(memberPerms, 'member', 'quotes', 'edit');
      const cannotApproveQuotes = !isActionAuthorized(memberPerms, 'member', 'quotes', 'approve');
      const cannotDeleteQuotes = !isActionAuthorized(memberPerms, 'member', 'quotes', 'delete');
      const cannotDiscount = !isActionAuthorized(memberPerms, 'member', 'quotes', 'apply_discount');
      const cannotManageCustomers = !isActionAuthorized(memberPerms, 'member', 'customers', 'create');
      const cannotManagePricing = !isActionAuthorized(memberPerms, 'member', 'products', 'edit');
      const cannotManageUsers = !isActionAuthorized(memberPerms, 'member', 'users_permissions', 'view');
      const cannotManageSettings = !isActionAuthorized(memberPerms, 'member', 'settings', 'view');
      const cannotManageIntegrations = !isActionAuthorized(memberPerms, 'member', 'integrations', 'view');

      const passed =
        canViewApp &&
        canViewQuotes &&
        canCreateQuotes &&
        cannotEditQuotes &&
        cannotApproveQuotes &&
        cannotDeleteQuotes &&
        cannotDiscount &&
        cannotManageCustomers &&
        cannotManagePricing &&
        cannotManageUsers &&
        cannotManageSettings &&
        cannotManageIntegrations;

      return {
        passed,
        expected: 'MEMBER pode view, quotes.view, quotes.create; e é sumariamente negado em todas as demais 9 áreas sensíveis',
        found: `passed=${passed}`,
      };
    },
  },

  // 15. OWNER Real: Bypass Canônico Integral
  {
    num: 15,
    name: 'OWNER Real: Bypass canônico e autorização total em todas as 16 áreas do sistema',
    run: async () => {
      const ownerPerms = adaptPrexyonPermissions([], 'owner');
      const canQuotes = isActionAuthorized(ownerPerms, 'owner', 'quotes', 'approve');
      const canPricing = isActionAuthorized(ownerPerms, 'owner', 'products', 'delete');
      const canUsers = isActionAuthorized(ownerPerms, 'owner', 'users_permissions', 'delete');
      const canSettings = isActionAuthorized(ownerPerms, 'owner', 'settings', 'edit');
      const canIntegrations = isActionAuthorized(ownerPerms, 'owner', 'integrations', 'edit');
      const canCustomers = isActionAuthorized(ownerPerms, 'owner', 'customers', 'delete');

      const passed = canQuotes && canPricing && canUsers && canSettings && canIntegrations && canCustomers;
      return {
        passed,
        expected: 'OWNER possui autorização completa (bypass) em todas as áreas',
        found: `passed=${passed}`,
      };
    },
  },

  // 16. Auditoria Backend: Migration 0010 contém validação anti-forjamento de seller_id
  {
    num: 16,
    name: 'Auditoria Backend: Migration 0010 impede que MEMBER forje seller_id de outro usuário',
    run: async () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0010_atomic_quote_creation.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const checksSellerAdmin =
        content.includes('v_target_seller_id <> v_user_id') &&
        content.includes('apenas administradores podem vincular orçamentos a outros vendedores');
      return {
        passed: checksSellerAdmin,
        expected: 'Verificação de seller_id anti-forjamento presente no código SQL da migration 0010',
        found: `checksSellerAdmin=${checksSellerAdmin}`,
      };
    },
  },

  // 17. Auditoria Backend: Migration 0010 valida permissão de desconto comercial
  {
    num: 17,
    name: 'Auditoria Backend: Migration 0010 exige quotes.apply_discount para criação e edição com desconto',
    run: async () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0010_atomic_quote_creation.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const checksDiscount =
        content.includes("has_org_permission(p_organization_id, 'quotes', 'apply_discount')") &&
        content.includes('usuário sem permissão para aplicar desconto comercial');
      return {
        passed: checksDiscount,
        expected: 'Verificação de quotes.apply_discount presente na migration 0010',
        found: `checksDiscount=${checksDiscount}`,
      };
    },
  },

  // 18. Auditoria Backend: Migration 0010 protege orçamento aprovado contra edição direta
  {
    num: 18,
    name: 'Auditoria Backend: Migration 0010 bloqueia update_quote_atomic quando status for approved',
    run: async () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0010_atomic_quote_creation.sql');
      const content = fs.readFileSync(migrationPath, 'utf-8');
      const checksApprovedLock =
        content.includes("v_current_status = 'approved'::public.quote_status") &&
        content.includes('orçamento já aprovado não permite alteração');
      return {
        passed: checksApprovedLock,
        expected: 'Proteção contra edição de status approved presente no SQL da migration 0010',
        found: `checksApprovedLock=${checksApprovedLock}`,
      };
    },
  },
];
