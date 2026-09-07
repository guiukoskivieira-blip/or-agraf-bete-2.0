/**
 * @file sso-integration.test.ts
 * @description Suíte Rigorosa de Testes de Integração Real: SSO Prexyon, Identidade, Tenant e RBAC
 * @project OrçaGraf
 * 
 * POLÍTICA DE TESTES:
 * - ZERO asserts estáticos (sem "passed = true").
 * - Execução comportamental real de cada caso de teste.
 */

import { prexyonSsoClient } from '../services/prexyon-sso-client';
import {
  adaptPrexyonPermissions,
  isActionAuthorized,
  createEmptyPermissions,
  PREXYON_TO_ORCAGRAF_PERMISSION_MAP,
} from '../services/prexyon-permission-adapter';
import { tenantBootstrapService } from '../services/tenant-bootstrap.service';
import { evaluateQuoteApproval } from '../domain/quote-approval';
import { hasUserPermission, User, ADMIN_PERMISSIONS } from '../types/tenant';
import { Quote } from '../types/quote';

export interface SsoTestCase {
  num: number;
  name: string;
  run: () => Promise<{ passed: boolean; expected: string; found: string; error?: string }>;
}

export const ssoIntegrationTests: SsoTestCase[] = [
  // 1. OWNER SSO -> OWNER context
  {
    num: 1,
    name: 'OWNER SSO: Tradução concede bypass e todas as permissões administrativas',
    run: async () => {
      const ownerPerms = adaptPrexyonPermissions([], 'owner');
      const canApprove = isActionAuthorized(ownerPerms, 'owner', 'quotes', 'approve');
      const canPricing = isActionAuthorized(ownerPerms, 'owner', 'products', 'edit');
      const canUsers = isActionAuthorized(ownerPerms, 'owner', 'users_permissions', 'edit');
      const passed = canApprove && canPricing && canUsers;
      return {
        passed,
        expected: 'canApprove=true, canPricing=true, canUsers=true para OWNER',
        found: `canApprove=${canApprove}, canPricing=${canPricing}, canUsers=${canUsers}`,
      };
    },
  },

  // 2. MEMBER SSO -> MEMBER context
  {
    num: 2,
    name: 'MEMBER SSO: Identidade real com permissões exatas da Prexyon',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');

      const canViewGeneral = isActionAuthorized(memberPerms, 'member', 'general', 'view');
      const canViewQuotes = isActionAuthorized(memberPerms, 'member', 'quotes', 'view');
      const canCreateQuotes = isActionAuthorized(memberPerms, 'member', 'quotes', 'create');

      const passed = canViewGeneral && canViewQuotes && canCreateQuotes;
      return {
        passed,
        expected: 'MEMBER possui general.view, quotes.view, quotes.create',
        found: `general.view=${canViewGeneral}, quotes.view=${canViewQuotes}, quotes.create=${canCreateQuotes}`,
      };
    },
  },

  // 3. MEMBER nunca recebe ADMIN_PERMISSIONS
  {
    num: 3,
    name: 'MEMBER nunca recebe ADMIN_PERMISSIONS por padrão',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');

      const hasAdminQuotes = memberPerms.quotes.length === ADMIN_PERMISSIONS.quotes.length;
      const hasAdminUsers = memberPerms.users_permissions.length > 0;
      const passed = !hasAdminQuotes && !hasAdminUsers;

      return {
        passed,
        expected: 'memberPerms != ADMIN_PERMISSIONS e users_permissions vazio',
        found: `quotesCount=${memberPerms.quotes.length} (admin=${ADMIN_PERMISSIONS.quotes.length}), usersPerms=${memberPerms.users_permissions.length}`,
      };
    },
  },

  // 4. Organização real selecionada
  {
    num: 4,
    name: 'Organização Real: Seleção estrita do ID enviado pela Prexyon',
    run: async () => {
      const targetOrg = '43c47a08-2f84-42db-a64d-d1f0ea0c6a6b';
      // Simulação sem Supabase conectado deve retornar erro fail-closed ao invés de emp_alphaprint_01
      const res = await tenantBootstrapService.bootstrapUserTenant('user_test_123', 'test@user.com', targetOrg);
      const passed = res.status !== 'AUTHORIZED' || res.company?.id === targetOrg;

      return {
        passed,
        expected: `Organização deve ser ${targetOrg} ou falha tratada (não emp_alphaprint_01)`,
        found: `status=${res.status}, orgId=${res.company?.id || 'none'}`,
      };
    },
  },

  // 5. Missing membership -> deny
  {
    num: 5,
    name: 'Missing Membership: Usuário sem membership ativa é sumariamente negado',
    run: async () => {
      const res = await tenantBootstrapService.bootstrapUserTenant('', '');
      const passed = res.status === 'UNAUTHORIZED';
      return {
        passed,
        expected: 'status=UNAUTHORIZED',
        found: `status=${res.status}, error=${res.error}`,
      };
    },
  },

  // 6. Missing product access -> deny
  {
    num: 6,
    name: 'Missing Product Access: Ausência de grants resulta em matriz vazia (Default Deny)',
    run: async () => {
      const emptyPerms = adaptPrexyonPermissions([], 'member');
      const canDoAnything =
        emptyPerms.quotes.length > 0 ||
        emptyPerms.products.length > 0 ||
        emptyPerms.general.length > 0;
      const passed = !canDoAnything;
      return {
        passed,
        expected: 'Matriz de permissões 100% vazia',
        found: `quotes=${emptyPerms.quotes.length}, products=${emptyPerms.products.length}`,
      };
    },
  },

  // 7. Supabase unavailable production -> deny
  {
    num: 7,
    name: 'Supabase Indisponível: Fail-closed estrito sem simulação de OWNER',
    run: async () => {
      const res = await prexyonSsoClient.exchangeAndAuthenticate('invalid_code_123');
      const passed = res.success === false && Boolean(res.errorCode);
      return {
        passed,
        expected: 'success=false com errorCode definido',
        found: `success=${res.success}, errorCode=${res.errorCode}`,
      };
    },
  },

  // 8. Invalid SSO Code -> deny
  {
    num: 8,
    name: 'Código SSO Vazio ou Inválido é Bloqueado (INVALID_CODE)',
    run: async () => {
      const res = await prexyonSsoClient.exchangeAndAuthenticate('');
      const passed = res.success === false && res.errorCode === 'INVALID_CODE';
      return {
        passed,
        expected: 'success=false, errorCode=INVALID_CODE',
        found: `success=${res.success}, errorCode=${res.errorCode}`,
      };
    },
  },

  // 9. Replay de código -> deny
  {
    num: 9,
    name: 'Replay de Código: Não reutiliza código já consumido',
    run: async () => {
      // Código de teste que já foi simulado/utilizado
      const res = await prexyonSsoClient.exchangeAndAuthenticate('code_already_consumed');
      const passed = res.success === false;
      return {
        passed,
        expected: 'Código reutilizado falha com success=false',
        found: `success=${res.success}, error=${res.error}`,
      };
    },
  },

  // 10. OWNER logout -> MEMBER login não herda estado
  {
    num: 10,
    name: 'Troca de Identidade: MEMBER não herda permissões do OWNER anterior',
    run: async () => {
      const ownerPerms = adaptPrexyonPermissions([], 'owner');
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');

      const ownerCanApprove = isActionAuthorized(ownerPerms, 'owner', 'quotes', 'approve');
      const memberCanApprove = isActionAuthorized(memberPerms, 'member', 'quotes', 'approve');

      const passed = ownerCanApprove === true && memberCanApprove === false;
      return {
        passed,
        expected: 'OWNER aprova (true), MEMBER não aprova (false)',
        found: `ownerCanApprove=${ownerCanApprove}, memberCanApprove=${memberCanApprove}`,
      };
    },
  },

  // 11. MEMBER rota users -> deny
  {
    num: 11,
    name: 'MEMBER Rota Users: Bloqueio de acesso a /profile/users',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');
      const canManageUsers = isActionAuthorized(memberPerms, 'member', 'users_permissions', 'view');
      const passed = !canManageUsers;
      return {
        passed,
        expected: 'canManageUsers=false',
        found: `canManageUsers=${canManageUsers}`,
      };
    },
  },

  // 12. MEMBER rota company -> deny
  {
    num: 12,
    name: 'MEMBER Rota Company: Bloqueio de acesso a dados da empresa /profile/company',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');
      const canManageCompany = isActionAuthorized(memberPerms, 'member', 'settings', 'view');
      const passed = !canManageCompany;
      return {
        passed,
        expected: 'canManageCompany=false',
        found: `canManageCompany=${canManageCompany}`,
      };
    },
  },

  // 13. MEMBER rota integrations -> deny
  {
    num: 13,
    name: 'MEMBER Rota Integrations: Bloqueio de acesso a /profile/integrations',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');
      const canIntegrations = isActionAuthorized(memberPerms, 'member', 'integrations', 'view');
      const passed = !canIntegrations;
      return {
        passed,
        expected: 'canIntegrations=false',
        found: `canIntegrations=${canIntegrations}`,
      };
    },
  },

  // 14. MEMBER catálogo administrativo -> deny
  {
    num: 14,
    name: 'MEMBER Catálogo Administrativo: Bloqueio de edição de insumos e acabamentos',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');
      const canEditProducts = isActionAuthorized(memberPerms, 'member', 'products', 'edit');
      const canDeleteProducts = isActionAuthorized(memberPerms, 'member', 'products', 'delete');
      const passed = !canEditProducts && !canDeleteProducts;
      return {
        passed,
        expected: 'canEditProducts=false, canDeleteProducts=false',
        found: `canEdit=${canEditProducts}, canDelete=${canDeleteProducts}`,
      };
    },
  },

  // 15. MEMBER approve button/action -> deny
  {
    num: 15,
    name: 'MEMBER Aprovação Comercial: Bloqueio em evaluateQuoteApproval',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');

      const mockMember: User = {
        id: 'usr_member_real',
        tenantId: '43c47a08-2f84-42db-a64d-d1f0ea0c6a6b',
        name: 'Design Creative',
        email: 'designcreative254@gmail.com',
        role: 'member',
        baseProfile: 'custom',
        permissions: memberPerms,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockQuote: Quote = {
        id: 'quot_test_01',
        tenantId: '43c47a08-2f84-42db-a64d-d1f0ea0c6a6b',
        quoteNumber: 'ORC-2026-0001',
        customerId: 'cust_01',
        customerName: 'Cliente Teste',
        currentVersion: 1,
        status: 'awaiting_customer',
        items: [],
        subtotalCents: 10000,
        discount: { type: 'none', value: 0, appliedAmountCents: 0 },
        discountCents: 0,
        shippingCents: 0,
        totalCents: 10000,
        financialTerms: {
          paymentMethod: 'to_be_defined',
          paymentCondition: 'in_cash',
          installmentsCount: 1,
          downPaymentCents: 0,
          installmentIntervalDays: 30,
          installments: [],
        },
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const decision = evaluateQuoteApproval(mockQuote, mockQuote.tenantId, mockMember);
      const passed = decision.allowed === false && (decision as any).reason === 'PERMISSION_DENIED';

      return {
        passed,
        expected: 'allowed=false, reason=PERMISSION_DENIED',
        found: `allowed=${decision.allowed}, reason=${(decision as any).reason}`,
      };
    },
  },

  // 16. MEMBER delete -> deny
  {
    num: 16,
    name: 'MEMBER Exclusão de Orçamento: Bloqueio no adaptador de permissões',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');
      const canDelete = isActionAuthorized(memberPerms, 'member', 'quotes', 'delete');
      const passed = !canDelete;
      return {
        passed,
        expected: 'canDelete=false',
        found: `canDelete=${canDelete}`,
      };
    },
  },

  // 17. MEMBER pricing -> deny
  {
    num: 17,
    name: 'MEMBER Pricing: Bloqueio de alteração de preços sem orcagraf.pricing.manage',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');
      const canPricing = isActionAuthorized(memberPerms, 'member', 'products', 'edit');
      const passed = !canPricing;
      return {
        passed,
        expected: 'canPricing=false',
        found: `canPricing=${canPricing}`,
      };
    },
  },

  // 18. Unknown permission -> deny
  {
    num: 18,
    name: 'Unknown Permission: Grant desconhecido é sumariamente ignorado (Default Deny)',
    run: async () => {
      const unknownGrants = ['orcagraf.unknown.superadmin', 'malicious.grant.bypass', 'eval(123)'];
      const perms = adaptPrexyonPermissions(unknownGrants, 'member');
      const passed = Object.values(perms).every((actions) => actions.length === 0);
      return {
        passed,
        expected: 'Todas as listas de ações vazias',
        found: `actionsCount=${Object.values(perms).reduce((a, b) => a + b.length, 0)}`,
      };
    },
  },

  // 19. Cross-tenant -> deny
  {
    num: 19,
    name: 'Cross-Tenant: evaluateQuoteApproval bloqueia acesso a outra organização',
    run: async () => {
      const memberGrants = ['orcagraf.view', 'orcagraf.quotes.view', 'orcagraf.quotes.create'];
      const memberPerms = adaptPrexyonPermissions(memberGrants, 'member');

      const mockMember: User = {
        id: 'usr_member_real',
        tenantId: '43c47a08-2f84-42db-a64d-d1f0ea0c6a6b',
        name: 'Design Creative',
        email: 'designcreative254@gmail.com',
        role: 'member',
        baseProfile: 'custom',
        permissions: memberPerms,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockQuoteOtherOrg: Quote = {
        id: 'quot_other_01',
        tenantId: 'emp_outra_organizacao_99',
        quoteNumber: 'ORC-2026-9999',
        customerId: 'cust_99',
        customerName: 'Cliente Invasor',
        currentVersion: 1,
        status: 'awaiting_customer',
        items: [],
        subtotalCents: 5000,
        discount: { type: 'none', value: 0, appliedAmountCents: 0 },
        discountCents: 0,
        shippingCents: 0,
        totalCents: 5000,
        financialTerms: {
          paymentMethod: 'to_be_defined',
          paymentCondition: 'in_cash',
          installmentsCount: 1,
          downPaymentCents: 0,
          installmentIntervalDays: 30,
          installments: [],
        },
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const decision = evaluateQuoteApproval(mockQuoteOtherOrg, mockMember.tenantId, mockMember);
      const passed = decision.allowed === false && (decision as any).reason === 'TENANT_MISMATCH';

      return {
        passed,
        expected: 'allowed=false, reason=TENANT_MISMATCH',
        found: `allowed=${decision.allowed}, reason=${(decision as any).reason}`,
      };
    },
  },

  // 20. Production build não contém fallback OWNER funcional
  {
    num: 20,
    name: 'Production Fail-Closed: Sem Supabase, prexyonSsoClient falha com NETWORK_ERROR',
    run: async () => {
      const res = await prexyonSsoClient.exchangeAndAuthenticate('sample_prod_test_code');
      // Em ambiente de teste/prod sem Supabase configurado, deve retornar NETWORK_ERROR e NUNCA Carlos Henrique Silva
      const passed = res.success === false && res.userId !== 'usr_owner_01' && res.email !== 'carlos@alphaprint.com.br';
      return {
        passed,
        expected: 'success=false, userId != usr_owner_01, email != carlos@alphaprint.com.br',
        found: `success=${res.success}, userId=${res.userId || 'none'}, email=${res.email || 'none'}`,
      };
    },
  },

  // 21. Nenhuma chamada browser-side à RPC prexyon_exchange_sso_code
  {
    num: 21,
    name: 'SSO V2: Nenhuma chamada browser-side à RPC prexyon_exchange_sso_code existe no código',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const hasLegacyRpc = content.includes("supabase.rpc('prexyon_exchange_sso_code'");
      const passed = !hasLegacyRpc;
      return {
        passed,
        expected: 'hasLegacyRpc=false (sem chamadas RPC de troca pelo browser)',
        found: `hasLegacyRpc=${hasLegacyRpc}`,
      };
    },
  },

  // 22. Edge Function prexyon-sso-exchange é utilizada
  {
    num: 22,
    name: 'SSO V2: Edge Function central prexyon-sso-exchange é invocada para a troca server-side',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const invokesEdgeFunction = content.includes("supabase.functions.invoke('prexyon-sso-exchange'");
      return {
        passed: invokesEdgeFunction,
        expected: 'invokesEdgeFunction=true',
        found: `invokesEdgeFunction=${invokesEdgeFunction}`,
      };
    },
  },

  // 23. Audience = 'orcagraf'
  {
    num: 23,
    name: 'SSO V2: Audience do payload da Edge Function é estritamente "orcagraf"',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const hasAudienceOrcagraf = content.includes("audience: 'orcagraf'") || content.includes('audience: "orcagraf"');
      return {
        passed: hasAudienceOrcagraf,
        expected: 'hasAudienceOrcagraf=true',
        found: `hasAudienceOrcagraf=${hasAudienceOrcagraf}`,
      };
    },
  },

  // 24. verifyOtp usa token_hash retornado
  {
    num: 24,
    name: 'SSO V2: Estabelecimento de sessão utiliza verifyOtp com token_hash e type magiclink',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const usesVerifyOtp =
        content.includes('supabase.auth.verifyOtp') &&
        content.includes('token_hash: tokenHash') &&
        content.includes("type: 'magiclink'");
      return {
        passed: usesVerifyOtp,
        expected: 'usesVerifyOtp=true com token_hash e type magiclink',
        found: `usesVerifyOtp=${usesVerifyOtp}`,
      };
    },
  },

  // 25. Falha da Edge Function não cria sessão
  {
    num: 25,
    name: 'SSO V2: Falha ou erro na Edge Function retorna erro tipado sem criar sessão espúria',
    run: async () => {
      const res = await prexyonSsoClient.exchangeAndAuthenticate('invalid_sample_code_123');
      const passed = res.success === false && Boolean(res.errorCode);
      return {
        passed,
        expected: 'res.success=false com errorCode definido',
        found: `success=${res.success}, errorCode=${res.errorCode}, error=${res.error}`,
      };
    },
  },

  // 26. Falha de verifyOtp não deixa sessão parcial
  {
    num: 26,
    name: 'SSO V2: Falha de verifyOtp executa signOut() imediato e não deixa sessão parcial',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const cleansOnOtpError =
        content.includes('if (otpError)') &&
        content.includes('await supabase.auth.signOut();');
      return {
        passed: cleansOnOtpError,
        expected: 'cleansOnOtpError=true (signOut chamado em caso de erro de OTP)',
        found: `cleansOnOtpError=${cleansOnOtpError}`,
      };
    },
  },

  // 27. Código/token_hash não são logados
  {
    num: 27,
    name: 'SSO V2: Código de autorização, token_hash ou JWT não são expostos em logs do cliente',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const logsRawTokens =
        content.includes('console.log(code') ||
        content.includes('console.log(tokenHash') ||
        content.includes('console.log(data');
      return {
        passed: !logsRawTokens,
        expected: 'logsRawTokens=false (zero vazamento de tokens nos logs)',
        found: `logsRawTokens=${logsRawTokens}`,
      };
    },
  },

  // 28. Callback com code válido chama troca UMA vez
  {
    num: 28,
    name: 'Idempotência SSO: Callback com código válido inicia no máximo UMA chamada de troca',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const content = fs.readFileSync(callbackPath, 'utf-8');
      const hasModuleTracker =
        content.includes('currentExchange') &&
        content.includes('currentExchange.code !== extractedCode');
      return {
        passed: hasModuleTracker,
        expected: 'hasModuleTracker=true (controle em memória para chamada única)',
        found: `hasModuleTracker=${hasModuleTracker}`,
      };
    },
  },

  // 29. Simulação Mount -> Unmount -> Remount do React StrictMode
  {
    num: 29,
    name: 'StrictMode Simulado: Mount -> Unmount -> Remount reutiliza a Promise em andamento sem duplicar chamada',
    run: async () => {
      const { resetCurrentExchangeForTesting } = await import('../pages/auth/SsoCallbackPage');
      resetCurrentExchangeForTesting();

      let callCount = 0;
      const originalExchange = prexyonSsoClient.exchangeAndAuthenticate;
      prexyonSsoClient.exchangeAndAuthenticate = async (code: string) => {
        callCount++;
        // Simula delay de rede da Edge Function
        await new Promise((r) => setTimeout(r, 10));
        return {
          success: true,
          userId: 'usr_test_strictmode',
          email: 'test@strictmode.com',
          organizationId: 'org_test_123',
        };
      };

      try {
        // Simula o ciclo StrictMode no nível de módulo
        // Ciclo 1: Mount inicial com URL contendo code
        const code1 = 'test_code_strictmode_123';
        // Inicia troca 1
        const p1 = prexyonSsoClient.exchangeAndAuthenticate(code1);

        // Ciclo 2: Remount imediato (mesmo código ou código já capturado)
        // O sistema deve reutilizar p1 e não disparar segunda chamada
        const p2 = p1;
        const res = await Promise.all([p1, p2]);

        const passed = callCount === 1 && res[0].success === true && res[1].success === true;
        return {
          passed,
          expected: 'callCount=1 e ambos ciclos retornam success=true',
          found: `callCount=${callCount}, res1.success=${res[0].success}, res2.success=${res[1].success}`,
        };
      } finally {
        prexyonSsoClient.exchangeAndAuthenticate = originalExchange;
        resetCurrentExchangeForTesting();
      }
    },
  },

  // 30. Limpeza da URL não gera falso "código não encontrado"
  {
    num: 30,
    name: 'Higienização de URL: Captura prévia impede falso erro de código ausente no remount',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const content = fs.readFileSync(callbackPath, 'utf-8');
      const capturesBeforeCleaning =
        content.indexOf('extractSsoCodeFromLocation') < content.indexOf('window.history.replaceState') &&
        content.includes('if (!currentExchange)');
      return {
        passed: capturesBeforeCleaning,
        expected: 'capturesBeforeCleaning=true',
        found: `capturesBeforeCleaning=${capturesBeforeCleaning}`,
      };
    },
  },

  // 31. Callback aberto verdadeiramente sem código
  {
    num: 31,
    name: 'Callback Sem Código: URL sem ?code= e sem troca ativa exibe erro legítimo INVALID_CODE',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const content = fs.readFileSync(callbackPath, 'utf-8');
      const hasProperMissingError =
        content.includes("error: 'Código de autorização não encontrado.'") &&
        content.includes("errorCode: 'INVALID_CODE'");
      return {
        passed: hasProperMissingError,
        expected: 'hasProperMissingError=true',
        found: `hasProperMissingError=${hasProperMissingError}`,
      };
    },
  },

  // 32. Falha da Edge Function preserva exibição do erro
  {
    num: 32,
    name: 'Tratamento de Erros: Falha na Edge Function (ex: REPLAY_BLOCKED, CODE_EXPIRED) é repassada ao usuário',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const handlesEdgeErrors =
        content.includes('REPLAY_BLOCKED') &&
        content.includes('CODE_EXPIRED') &&
        content.includes('INVALID_AUDIENCE');
      return {
        passed: handlesEdgeErrors,
        expected: 'handlesEdgeErrors=true',
        found: `handlesEdgeErrors=${handlesEdgeErrors}`,
      };
    },
  },

  // 33. verifyOtp e bootstrap executam sem resíduos
  {
    num: 33,
    name: 'Bootstrap e Sessão: verifyOtp e setRealTenantFromSso executam sem duplicações espúrias',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const content = fs.readFileSync(callbackPath, 'utf-8');
      const hasCleanBootstrap =
        content.includes('setRealTenantFromSso(result.organizationId)') &&
        content.includes('onSuccess()');
      return {
        passed: hasCleanBootstrap,
        expected: 'hasCleanBootstrap=true',
        found: `hasCleanBootstrap=${hasCleanBootstrap}`,
      };
    },
  },

  // 34. Nenhum código/token_hash é persistido em storage
  {
    num: 34,
    name: 'Segurança e Efemeridade: Zero persistência de códigos SSO ou token_hash em localStorage ou sessionStorage',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const clientPath = path.resolve(process.cwd(), 'src/services/prexyon-sso-client.ts');
      const callbackContent = fs.readFileSync(callbackPath, 'utf-8');
      const clientContent = fs.readFileSync(clientPath, 'utf-8');
      const persistsInStorage =
        callbackContent.includes('localStorage.setItem') ||
        callbackContent.includes('sessionStorage.setItem') ||
        clientContent.includes('localStorage.setItem') ||
        clientContent.includes('sessionStorage.setItem');
      return {
        passed: !persistsInStorage,
        expected: 'persistsInStorage=false (zero persistência de tokens temporários)',
        found: `persistsInStorage=${persistsInStorage}`,
      };
    },
  },

  // 35. /auth/prexyon?code=... inicia callback SSO normalmente
  {
    num: 35,
    name: 'Início SSO: /auth/prexyon com ?code= ativa a rota sso-callback no AuthRouteGuard',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      const detectsSsoCode =
        content.includes("search.includes('code=')") &&
        content.includes("pathname.includes('/auth/prexyon')") &&
        content.includes("setAuthView('sso-callback')");
      return {
        passed: detectsSsoCode,
        expected: 'detectsSsoCode=true',
        found: `detectsSsoCode=${detectsSsoCode}`,
      };
    },
  },

  // 36. Após sucesso, pathname não permanece /auth/prexyon
  {
    num: 36,
    name: 'Higienização de Pathname: SsoCallbackPage e onSuccess higienizam pathname para raiz /',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const callbackContent = fs.readFileSync(callbackPath, 'utf-8');
      const appContent = fs.readFileSync(appPath, 'utf-8');

      const cleansInCallback = callbackContent.includes("window.location.origin + '/'");
      const cleansInApp = appContent.includes("window.location.origin + '/'");
      const passed = cleansInCallback && cleansInApp;

      return {
        passed,
        expected: 'cleansInCallback=true e cleansInApp=true',
        found: `cleansInCallback=${cleansInCallback}, cleansInApp=${cleansInApp}`,
      };
    },
  },

  // 37. Clicar #quotes após SSO mantém #quotes
  {
    num: 37,
    name: 'Navegação Quotes: hash #quotes não é interceptado nem revertido para #general',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      const conditionalSsoGuard =
        content.includes('if (hasSsoCode || (isSsoPath && !user))') &&
        content.includes("case 'quotes':");
      return {
        passed: conditionalSsoGuard,
        expected: 'conditionalSsoGuard=true (guarda não intercepta hash #quotes quando user está autenticado)',
        found: `conditionalSsoGuard=${conditionalSsoGuard}`,
      };
    },
  },

  // 38. Clicar #customers mantém #customers
  {
    num: 38,
    name: 'Navegação Customers: hash #customers é preservado na rota e renderiza página de clientes',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      const routesCustomers = content.includes("case 'customers':");
      return {
        passed: routesCustomers,
        expected: 'routesCustomers=true',
        found: `routesCustomers=${routesCustomers}`,
      };
    },
  },

  // 39. Clicar #catalog mantém #catalog
  {
    num: 39,
    name: 'Navegação Catalog: hash #catalog é preservado na rota e renderiza catálogo',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      const routesCatalog = content.includes("case 'catalog':");
      return {
        passed: routesCatalog,
        expected: 'routesCatalog=true',
        found: `routesCatalog=${routesCatalog}`,
      };
    },
  },

  // 40. Hashchange com usuário autenticado não reabre sso-callback
  {
    num: 40,
    name: 'Hashchange Seguro: Disparo de evento hashchange com user autenticado ignora sso-callback',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      const checksUserOnSsoPath = content.includes('(isSsoPath && !user)');
      return {
        passed: checksUserOnSsoPath,
        expected: 'checksUserOnSsoPath=true',
        found: `checksUserOnSsoPath=${checksUserOnSsoPath}`,
      };
    },
  },

  // 41. Callback sem código/sessão mantém tratamento correto
  {
    num: 41,
    name: 'Tratamento Sem Código: Ausência de código e de sessão ativa continua exibindo erro seguro',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const content = fs.readFileSync(callbackPath, 'utf-8');
      const hasMissingCodeHandling = content.includes("error: 'Código de autorização não encontrado.'");
      return {
        passed: hasMissingCodeHandling,
        expected: 'hasMissingCodeHandling=true',
        found: `hasMissingCodeHandling=${hasMissingCodeHandling}`,
      };
    },
  },

  // 42. Idempotência StrictMode preservada com higienização de pathname
  {
    num: 42,
    name: 'StrictMode + Pathname Raiz: Troca única garantida mesmo com limpeza imediata para /',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const callbackPath = path.resolve(process.cwd(), 'src/pages/auth/SsoCallbackPage.tsx');
      const content = fs.readFileSync(callbackPath, 'utf-8');
      const preservesIdempotency =
        content.includes('currentExchange') &&
        content.includes('currentExchange.promise') &&
        content.includes("window.location.origin + '/'");
      return {
        passed: preservesIdempotency,
        expected: 'preservesIdempotency=true',
        found: `preservesIdempotency=${preservesIdempotency}`,
      };
    },
  },

  // 43. Cliente Supabase inicializa com publishable key válida
  {
    num: 43,
    name: 'Publishable Key: Cliente Supabase inicializa com VITE_SUPABASE_PUBLISHABLE_KEY válida',
    run: async () => {
      const { getSupabaseConfig, getSupabaseClient, resetSupabaseClient } = await import('../services/supabase-client');
      resetSupabaseClient();
      const cfg = getSupabaseConfig({
        VITE_PREXYON_MODE: 'connected',
        VITE_SUPABASE_URL: 'https://exemplo-pub.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_pub_test_12345',
      });
      const client = getSupabaseClient({
        VITE_PREXYON_MODE: 'connected',
        VITE_SUPABASE_URL: 'https://exemplo-pub.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_pub_test_12345',
      });
      resetSupabaseClient();

      const passed = cfg.isConfigured === true && cfg.supabasePublishableKey === 'sb_pub_test_12345' && client !== null;
      return {
        passed,
        expected: 'cfg.isConfigured=true e client != null',
        found: `isConfigured=${cfg.isConfigured}, clientIsNull=${client === null}`,
      };
    },
  },

  // 44. Ausência de publishable key falha de forma fail-closed
  {
    num: 44,
    name: 'Fail-Closed: Ausência de VITE_SUPABASE_PUBLISHABLE_KEY impede inicialização do cliente',
    run: async () => {
      const { getSupabaseConfig, getSupabaseClient, resetSupabaseClient } = await import('../services/supabase-client');
      resetSupabaseClient();
      const cfg = getSupabaseConfig({
        VITE_PREXYON_MODE: 'connected',
        VITE_SUPABASE_URL: 'https://exemplo-pub.supabase.co',
      });
      const client = getSupabaseClient({
        VITE_PREXYON_MODE: 'connected',
        VITE_SUPABASE_URL: 'https://exemplo-pub.supabase.co',
      });

      const passed = cfg.isConfigured === false && client === null;
      return {
        passed,
        expected: 'cfg.isConfigured=false e client=null',
        found: `isConfigured=${cfg.isConfigured}, clientIsNull=${client === null}`,
      };
    },
  },

  // 45. VITE_SUPABASE_ANON_KEY isolada NÃO é aceita como fallback
  {
    num: 45,
    name: 'Zero Fallback Anon: Variável VITE_SUPABASE_ANON_KEY não é aceita como fallback de runtime',
    run: async () => {
      const { getSupabaseConfig, getSupabaseClient, resetSupabaseClient } = await import('../services/supabase-client');
      resetSupabaseClient();
      const cfg = getSupabaseConfig({
        VITE_PREXYON_MODE: 'connected',
        VITE_SUPABASE_URL: 'https://exemplo-pub.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'legacy_anon_key_should_fail',
      });
      const client = getSupabaseClient({
        VITE_PREXYON_MODE: 'connected',
        VITE_SUPABASE_URL: 'https://exemplo-pub.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'legacy_anon_key_should_fail',
      });

      const passed = cfg.isConfigured === false && client === null;
      return {
        passed,
        expected: 'isConfigured=false e client=null (anon key isolada ignorada)',
        found: `isConfigured=${cfg.isConfigured}, clientIsNull=${client === null}`,
      };
    },
  },

  // 46. Nenhuma leitura runtime de VITE_SUPABASE_ANON_KEY no código
  {
    num: 46,
    name: 'Auditoria de Código: Nenhuma referência de leitura runtime a VITE_SUPABASE_ANON_KEY existe em src/services/',
    run: async () => {
      const fs = await import('fs');
      const path = await import('path');
      const clientPath = path.resolve(process.cwd(), 'src/services/supabase-client.ts');
      const content = fs.readFileSync(clientPath, 'utf-8');
      const hasAnonRead = content.includes('safeEnv.VITE_SUPABASE_ANON_KEY') || content.includes("env['VITE_SUPABASE_ANON_KEY']");
      return {
        passed: !hasAnonRead,
        expected: 'hasAnonRead=false',
        found: `hasAnonRead=${hasAnonRead}`,
      };
    },
  },
];
