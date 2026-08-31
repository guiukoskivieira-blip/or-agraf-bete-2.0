/**
 * @file LoginPage.tsx
 * @description Tela Oficial de Login Comercial do OrçaGraf (Supabase Auth)
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OrcaGrafLogo } from '../../components/common/OrcaGrafLogo';

interface LoginPageProps {
  onNavigateForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateForgotPassword }) => {
  const { signInWithPassword, loading, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setClientError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setClientError('Informe seu e-mail e senha para continuar.');
      return;
    }

    await signInWithPassword(trimmedEmail, password);
  };

  const displayError = clientError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/40 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header com Logo Oficial */}
        <div className="flex flex-col items-center text-center space-y-2">
          <OrcaGrafLogo size="lg" />
          <p className="text-xs sm:text-sm text-slate-500 font-medium pt-1">
            Sistema Comercial e Emissão de Propostas Gráficas
          </p>
        </div>

        {/* Card do Formulário de Login */}
        <Card className="p-6 sm:p-8 bg-white border border-slate-200/80 shadow-md rounded-2xl">
          <div className="mb-6">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Acesse sua conta</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Informe suas credenciais autorizadas para acessar o painel.
            </p>
          </div>

          {displayError && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{displayError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                E-mail de Acesso
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (displayError) {
                      setClientError(null);
                      clearError();
                    }
                  }}
                  disabled={loading}
                  placeholder="seu.email@grafica.com.br"
                  autoComplete="email"
                  required
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 outline-none transition-all shadow-xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Campo Senha com Alternância */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={onNavigateForgotPassword}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500 rounded outline-none cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (displayError) {
                      setClientError(null);
                      clearError();
                    }
                  }}
                  disabled={loading}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 outline-none transition-all shadow-xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-md focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Envio com Loading */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full justify-center text-sm font-semibold"
                icon={
                  loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )
                }
              >
                {loading ? 'Autenticando...' : 'Entrar no Sistema'}
              </Button>
            </div>
          </form>

          {/* Rodapé de Acesso Controlado (Sem cadastro público) */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ambiente seguro. Acesso restrito a usuários autorizados.</span>
          </div>
        </Card>

        {/* Rodapé Institucional */}
        <div className="text-center text-xs text-slate-400">
          OrçaGraf • Ecossistema Prexyon
        </div>
      </div>
    </div>
  );
};
