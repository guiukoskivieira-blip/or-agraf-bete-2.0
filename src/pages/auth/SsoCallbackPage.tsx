/**
 * @file SsoCallbackPage.tsx
 * @description Página de Recepção do Login Único Prexyon com Limpeza Imediata de URL e Validação Server-Side
 * @project OrçaGraf
 */

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { prexyonSsoClient, SsoExchangeResult } from '../../services/prexyon-sso-client';
import { useTenant } from '../../context/TenantContext';

interface SsoCallbackPageProps {
  onSuccess: () => void;
  onNavigateLogin?: () => void;
}

export const SsoCallbackPage: React.FC<SsoCallbackPageProps> = ({
  onSuccess,
  onNavigateLogin,
}) => {
  const { updateCompanySettings, setRealTenantFromSso } = useTenant();
  const [loading, setLoading] = useState(true);
  const [errorResult, setErrorResult] = useState<SsoExchangeResult | null>(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Evita execução duplicada por React StrictMode ou re-renders
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processSso = async () => {
      // 1. Extrair código dos parâmetros de busca da URL ou do Hash
      let code: string | null = null;

      const searchParams = new URLSearchParams(window.location.search);
      code = searchParams.get('code');

      if (!code && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get('code');
      }

      // 2. Limpeza Imediata da URL (Remove ?code=... do histórico e da barra de endereço)
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      if (!code) {
        setLoading(false);
        setErrorResult({
          success: false,
          error: 'Código de autorização não encontrado ou já processado.',
          errorCode: 'INVALID_CODE',
        });
        return;
      }

      // 3. Executar troca server-side segura
      const result = await prexyonSsoClient.exchangeAndAuthenticate(code);

      if (result.success) {
        // Se a Prexyon enviou uma organização específica, aplica autoritativamente no contexto real
        if (result.organizationId && setRealTenantFromSso) {
          await setRealTenantFromSso(result.organizationId);
        } else if (result.organizationId) {
          updateCompanySettings({ id: result.organizationId });
        }
        setLoading(false);
        onSuccess();
      } else {
        setLoading(false);
        setErrorResult(result);
      }
    };

    processSso();
  }, [onSuccess, updateCompanySettings, setRealTenantFromSso]);

  const handleReturnToPrexyon = () => {
    const portalUrl = import.meta.env.VITE_PREXYON_PORTAL_URL || 'https://prexyon-production.up.railway.app';
    window.location.href = portalUrl;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-8 backdrop-blur-sm text-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold text-white tracking-tight">OrçaGraf</h1>
            <p className="text-xs text-slate-400">Ecossistema Prexyon</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-6 animate-in fade-in duration-200">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
            <div>
              <h2 className="text-base font-semibold text-slate-200">
                Entrando com sua conta Prexyon...
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Validando autorização e preparando seu ambiente de trabalho.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && errorResult && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Não foi possível concluir o acesso
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                {errorResult.error}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleReturnToPrexyon}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o Portal Prexyon</span>
              </button>

              {onNavigateLogin && (
                <button
                  onClick={onNavigateLogin}
                  className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  Entrar com e-mail e senha no OrçaGraf
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
