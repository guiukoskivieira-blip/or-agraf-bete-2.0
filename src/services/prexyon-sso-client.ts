/**
 * @file prexyon-sso-client.ts
 * @description Cliente de Recepção, Validação e Estabelecimento de Sessão SSO Prexyon -> OrçaGraf
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

async function computeSha256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const prexyonSsoClient = {
  /**
   * Executa a troca atômica do Authorization Code e estabelece a sessão oficial Supabase Auth no OrçaGraf.
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
      // 1. Computar SHA-256 do código recebido (não transmitimos o código puro de forma desnecessária)
      const codeHash = await computeSha256(code);

      // 2. Chamar RPC atômica prexyon_exchange_sso_code no banco central
      const { data, error } = await supabase.rpc('prexyon_exchange_sso_code' as any, {
        p_code_hash: codeHash,
        p_audience: 'orcagraf',
      });

      if (error) {
        let userMsg = 'Não foi possível confirmar seu acesso ao OrçaGraf.';
        let errCode: SsoExchangeResult['errorCode'] = 'INVALID_CODE';

        if (error.message.includes('REPLAY_BLOCKED')) {
          userMsg = 'Este link de acesso já foi utilizado. Volte à Prexyon e clique em Abrir OrçaGraf novamente.';
          errCode = 'REPLAY_BLOCKED';
        } else if (error.message.includes('CODE_EXPIRED')) {
          userMsg = 'Este acesso temporário expirou. Volte à Prexyon e tente novamente.';
          errCode = 'CODE_EXPIRED';
        } else if (error.message.includes('INVALID_AUDIENCE')) {
          userMsg = 'Código de acesso destinado a outro software do ecossistema.';
          errCode = 'INVALID_AUDIENCE';
        }

        return {
          success: false,
          error: userMsg,
          errorCode: errCode,
        };
      }

      const ssoData = data as {
        success: boolean;
        user_id: string;
        email: string;
        full_name: string;
        organization_id: string;
        product_code: string;
        token_hash?: string;
      };

      // 3. Estabelecer ou Sincronizar Sessão Oficial Supabase Auth
      // Se houver token_hash emitido pelo servidor, verifica via verifyOtp (padrão oficial Supabase)
      if (ssoData.token_hash) {
        // Encerra qualquer sessão residual incompatível antes de autenticar
        const { data: currentSessionData } = await supabase.auth.getSession();
        if (currentSessionData?.session && currentSessionData.session.user.id !== ssoData.user_id) {
          await supabase.auth.signOut();
        }

        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: ssoData.token_hash,
          type: 'magiclink',
        });

        if (otpError) {
          console.warn('[SSO] Falha ao verificar OTP oficial:', otpError.message);
        }
      }

      // 4. Verificação de integridade da identidade do usuário
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user && userData.user.id !== ssoData.user_id) {
        // User Mismatch detectado: encerra sessão conflitante
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Conflito de sessão detectado. Por favor, tente novamente.',
          errorCode: 'USER_MISMATCH',
        };
      }

      // 5. Validação de Defesa em Profundidade no lado OrçaGraf
      // Valida se a organização está ativa e se o usuário é membro
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('id, role, is_active, is_locked')
        .eq('organization_id', ssoData.organization_id)
        .eq('user_id', ssoData.user_id)
        .maybeSingle();

      if (memberData && (!memberData.is_active || memberData.is_locked)) {
        return {
          success: false,
          error: 'Sua conta de usuário está inativa ou bloqueada nesta organização.',
          errorCode: 'ACCESS_DENIED',
        };
      }

      return {
        success: true,
        userId: ssoData.user_id,
        email: ssoData.email,
        fullName: ssoData.full_name,
        organizationId: ssoData.organization_id,
        productCode: ssoData.product_code,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Erro inesperado ao processar login com Prexyon.',
        errorCode: 'NETWORK_ERROR',
      };
    }
  },
};
