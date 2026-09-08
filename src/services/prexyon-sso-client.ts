/**
 * @file prexyon-sso-client.ts
 * @description Cliente de Recepção, Validação e Estabelecimento de Sessão SSO V2 Prexyon -> OrçaGraf
 * @project OrçaGraf
 */

import { getSupabaseClient } from './supabase-client';

export interface SsoExchangeResult {
  success: boolean;
  userId?: string;
  email?: string;
  fullName?: string;
  organizationId?: string;
  productCode?: string;
  error?: string;
  errorCode?: 'CODE_EXPIRED' | 'REPLAY_BLOCKED' | 'INVALID_AUDIENCE' | 'INVALID_CODE' | 'USER_MISMATCH' | 'ACCESS_DENIED' | 'NETWORK_ERROR';
}

export const prexyonSsoClient = {
  /**
   * Executa a troca atômica do Authorization Code via Edge Function central Prexyon SSO V2
   * e estabelece a sessão oficial Supabase Auth no OrçaGraf.
   */
  async exchangeAndAuthenticate(code: string): Promise<SsoExchangeResult> {
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return {
        success: false,
        error: 'Código de autorização não fornecido.',
        errorCode: 'INVALID_CODE',
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      // FAIL-CLOSED: Nunca concede acesso nem simula credenciais de owner quando o cliente está indisponível
      return {
        success: false,
        error: 'Serviço de autenticação central Supabase indisponível. Verifique as variáveis de ambiente.',
        errorCode: 'NETWORK_ERROR',
      };
    }

    try {
      // 1. Invocar Edge Function central prexyon-sso-exchange (SSO V2 Oficial)
      const { data, error } = await supabase.functions.invoke('prexyon-sso-exchange', {
        body: {
          code: code.trim(),
          audience: 'orcagraf',
        },
      });

      if (error || !data || data.success === false) {
        let userMsg = 'Não foi possível confirmar seu acesso ao OrçaGraf.';
        let errCode: SsoExchangeResult['errorCode'] = 'INVALID_CODE';

        const errMsg = (data?.error || error?.message || '').toString();

        if (errMsg.includes('REPLAY_BLOCKED')) {
          userMsg = 'Este link de acesso já foi utilizado. Volte à Prexyon e clique em Abrir OrçaGraf novamente.';
          errCode = 'REPLAY_BLOCKED';
        } else if (errMsg.includes('CODE_EXPIRED')) {
          userMsg = 'Este acesso temporário expirou. Volte à Prexyon e tente novamente.';
          errCode = 'CODE_EXPIRED';
        } else if (errMsg.includes('INVALID_AUDIENCE')) {
          userMsg = 'Código de acesso destinado a outro software do ecossistema.';
          errCode = 'INVALID_AUDIENCE';
        } else if (errMsg.includes('INVALID_CODE')) {
          userMsg = 'Código de autorização inválido ou expirado.';
          errCode = 'INVALID_CODE';
        }

        return {
          success: false,
          error: userMsg,
          errorCode: errCode,
        };
      }

      // 2. Extrair dados da resposta (com suporte a snake_case e camelCase)
      const tokenHash = (data.token_hash || data.tokenHash || data.token) as string | undefined;
      const userId = (data.user_id || data.userId) as string;
      const email = (data.email) as string;
      const fullName = (data.full_name || data.fullName || data.name) as string;
      const organizationId = (data.organization_id || data.organizationId) as string;
      const productCode = (data.product_code || data.productCode || 'orcagraf') as string;

      // 3. Estabelecer ou Sincronizar Sessão Oficial Supabase Auth via verifyOtp
      if (tokenHash) {
        // Encerra qualquer sessão residual incompatível antes de autenticar
        const { data: currentSessionData } = await supabase.auth.getSession();
        if (currentSessionData?.session && currentSessionData.session.user.id !== userId) {
          await supabase.auth.signOut();
        }

        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });

        if (otpError) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Falha ao autenticar sessão com a chave de acesso. Tente novamente.',
            errorCode: 'INVALID_CODE',
          };
        }
      }

      // 4. Verificação de integridade da identidade do usuário
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user && userId && userData.user.id !== userId) {
        // User Mismatch detectado: encerra sessão conflitante
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Conflito de sessão detectado. Por favor, tente novamente.',
          errorCode: 'USER_MISMATCH',
        };
      }

      // 5. Validação de Defesa em Profundidade no lado OrçaGraf
      if (organizationId && userId) {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('id, role, is_active, is_locked')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (memberData && (!memberData.is_active || memberData.is_locked)) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Sua conta de usuário está inativa ou bloqueada nesta organização.',
            errorCode: 'ACCESS_DENIED',
          };
        }
      }

      return {
        success: true,
        userId,
        email,
        fullName,
        organizationId,
        productCode,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Erro inesperado ao processar login com Prexyon.',
        errorCode: 'NETWORK_ERROR',
      };
    }
  },

  /**
   * Gera código de autorização Prexyon SSO V2 via Edge Function central
   * e constrói a URL de redirecionamento para o produto destino.
   */
  async generateProductRedirect(
    targetProduct: 'arteflow' | 'artecheck' | 'orcagraf',
    targetOrganizationId?: string
  ): Promise<{ success: boolean; code?: string; redirectUrl?: string; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Cliente de autenticação não inicializado.' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('prexyon-sso-generate', {
        body: {
          target_product: targetProduct,
          target_organization_id: targetOrganizationId,
        },
      });

      if (error || !data || data.success === false) {
        return {
          success: false,
          error: data?.error || error?.message || 'Falha ao gerar chave de acesso entre produtos.',
        };
      }

      if (data.redirect_url) {
        return { success: true, redirectUrl: data.redirect_url };
      }

      const code = data.code || data.authorization_code;
      if (!code) {
        return { success: false, error: 'Código de autorização não retornado pelo servidor.' };
      }

      return { success: true, code };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Erro ao conectar ao serviço de autorização Prexyon SSO.',
      };
    }
  },
};

export async function generateProductRedirect(
  targetProduct: 'arteflow' | 'artecheck' | 'orcagraf',
  targetOrganizationId?: string
) {
  return prexyonSsoClient.generateProductRedirect(targetProduct, targetOrganizationId);
}

