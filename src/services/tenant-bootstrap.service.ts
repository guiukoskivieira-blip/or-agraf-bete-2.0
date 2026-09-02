/**
 * @file tenant-bootstrap.service.ts
 * @description Serviço Autoritativo de Bootstrap de Tenant, Identidade e Permissões a partir do Supabase
 * @project OrçaGraf
 * 
 * POLÍTICA DE SEGURANÇA:
 * - FAIL-CLOSED: Erros de rede ou ausência de membership NUNCA promovem o usuário para OWNER.
 * - NUNCA utiliza dados mock ou seed quando em modo conectado.
 * - Converte permissões Prexyon autoritativas usando adaptPrexyonPermissions.
 */

import { getSupabaseClient } from './supabase-client';
import { adaptPrexyonPermissions } from './prexyon-permission-adapter';
import { Company, User, UserRole, BaseProfile } from '../types/tenant';

export interface TenantBootstrapResult {
  status: 'AUTHORIZED' | 'UNAUTHORIZED' | 'ERROR';
  user?: User;
  company?: Company;
  error?: string;
}

export const tenantBootstrapService = {
  /**
   * Carrega os dados reais de identidade, organização e permissões do usuário autenticado no Supabase.
   * 
   * @param authUserId ID do usuário autenticado no Supabase (auth.uid())
   * @param authEmail E-mail do usuário autenticado
   * @param preferredOrgId ID da organização desejada (ex: vinda do SSO Prexyon)
   */
  async bootstrapUserTenant(
    authUserId: string,
    authEmail: string,
    preferredOrgId?: string
  ): Promise<TenantBootstrapResult> {
    if (!authUserId) {
      return {
        status: 'UNAUTHORIZED',
        error: 'Identificador de usuário não fornecido para o bootstrap.',
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        status: 'ERROR',
        error: 'Cliente Supabase não inicializado.',
      };
    }

    try {
      // 1. Busca Membresias ativas e não bloqueadas do usuário
      let query = supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          base_profile,
          permissions_json,
          is_active,
          is_locked,
          created_at,
          updated_at
        `)
        .eq('user_id', authUserId)
        .eq('is_active', true)
        .eq('is_locked', false);

      if (preferredOrgId) {
        query = query.eq('organization_id', preferredOrgId);
      }

      const { data: members, error: memberError } = await query;

      if (memberError) {
        console.error('[TenantBootstrap] Erro ao buscar membresia:', memberError.message);
        return {
          status: 'ERROR',
          error: 'Falha de comunicação ao verificar permissões da organização.',
        };
      }

      if (!members || members.length === 0) {
        return {
          status: 'UNAUTHORIZED',
          error: preferredOrgId
            ? `Você não possui vínculo ativo na organização solicitada (${preferredOrgId}).`
            : 'Sua conta de usuário não possui membresia ativa em nenhuma organização gráfica autorizada.',
        };
      }

      // Seleciona a membresia da organização (a preferida ou a primeira ativa)
      const membership = members[0];
      const orgId = membership.organization_id;

      // 2. Busca os dados da Organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (orgError) {
        console.error('[TenantBootstrap] Erro ao buscar organização:', orgError.message);
        return {
          status: 'ERROR',
          error: 'Falha ao obter dados da organização no servidor.',
        };
      }

      if (!orgData) {
        return {
          status: 'UNAUTHORIZED',
          error: 'A organização vinculada à sua conta está inativa ou foi descontinuada.',
        };
      }

      // 3. Busca o perfil do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', authUserId)
        .maybeSingle();

      const fullName = profileData?.full_name || authEmail.split('@')[0] || 'Usuário';
      const avatarUrl = profileData?.avatar_url || undefined;

      // 4. Adaptação Canônica de Permissões (Prexyon / DB -> RBAC OrçaGraf)
      const adaptedPermissions = adaptPrexyonPermissions(
        membership.permissions_json,
        membership.role
      );

      // Determina papel e baseProfile reais
      const role = (membership.role as UserRole) || 'member';
      const baseProfile = (membership.base_profile as BaseProfile) ||
        (role === 'owner' || role === 'admin' ? 'admin' : 'custom');

      const realUser: User = {
        id: authUserId,
        tenantId: orgId,
        name: fullName,
        email: authEmail,
        role,
        baseProfile,
        permissions: adaptedPermissions,
        avatarUrl,
        isActive: true,
        dataOrigin: 'real',
        createdAt: membership.created_at || new Date().toISOString(),
        updatedAt: membership.updated_at || new Date().toISOString(),
      };

      const realCompany: Company = {
        id: orgData.id,
        tradeName: orgData.trade_name || 'Gráfica Comercial',
        corporateName: orgData.corporate_name || orgData.trade_name || '',
        document: orgData.document || '',
        stateRegistration: orgData.state_registration || undefined,
        email: orgData.email || '',
        phone: orgData.phone || '',
        whatsapp: orgData.whatsapp || undefined,
        managerName: fullName || 'Gestor Responsável',
        address: orgData.address_json || {
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: '',
        },
        branding: orgData.branding_json || {
          primaryColor: '#2563eb',
          secondaryColor: '#0d9488',
          accentColor: '#4f46e5',
          showLogoInQuotes: true,
        },
        customization: orgData.customization_json || {
          headerNote: 'Proposta comercial para impressão gráfica.',
          footerDisclaimer: 'Garantia de fabricação de até 30 dias.',
          defaultPaymentTerms: 'Pix à vista ou a combinar',
          defaultProductionDays: 3,
          commercialNotes: 'Preços calculados para arquivos fechados conforme gabarito.',
          showTechnicalDetailsToCustomer: true,
        },
        settings: orgData.settings_json || { currency: 'BRL' },
        dataOrigin: 'real',
        createdAt: orgData.created_at || new Date().toISOString(),
        updatedAt: orgData.updated_at || new Date().toISOString(),
      };

      return {
        status: 'AUTHORIZED',
        user: realUser,
        company: realCompany,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado no bootstrap de tenant.';
      console.error('[TenantBootstrap] Exceção crítica:', message);
      return {
        status: 'ERROR',
        error: message,
      };
    }
  },
};
