/**
 * @file ResetPasswordPage.tsx
 * @description Tela de Definição de Nova Senha após Link de Recuperação do Supabase
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OrcaGrafLogo } from '../../components/common/OrcaGrafLogo';

interface ResetPasswordPageProps {
  onNavigateLogin: () => void;
  onSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigateLogin,
  onSuccess,
}) => {
  const { updatePassword, loading, authError, clearError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setClientError(null);

    if (password.length < 6) {
      setClientError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setClientError('As senhas digitadas não coincidem.');
      return;
    }

    const { error } = await updatePassword(password);
    if (!error) {
      setIsSuccess(true);
    }
  };

  const displayError = clientError || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/40 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <OrcaGrafLogo size="lg" />
          <p className="text-xs sm:text-sm text-slate-500 font-medium pt-1">
            Redefinição de Senha
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white border border-slate-200/80 shadow-md rounded-2xl">
          {isSuccess ? (
            <div className="space-y-6 text-center" role="status" aria-live="polite">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Senha Alterada!</h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sua nova senha foi gravada com sucesso. Você já pode acessar a plataforma com suas novas credenciais.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onSuccess || onNavigateLogin}
                  icon={<ArrowRight className="w-4 h-4" />}
                  className="w-full justify-center text-sm font-semibold"
                >
                  Continuar para o Sistema
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Criar Nova Senha</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Defina uma nova senha segura para sua conta de acesso ao OrçaGraf.
                </p>
              </div>

              {displayError && (
                <div
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{displayError}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Campo Nova Senha */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Nova Senha (mín. 6 caracteres)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reset-password"
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
                      autoComplete="new-password"
                      required
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-600 outline-none transition-all shadow-xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 outline-none cursor-pointer"
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Campo Confirmar Nova Senha */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Confirmar Nova Senha
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reset-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        if (displayError) {
                          setClientError(null);
                          clearError();
                        }
                      }}
                      disabled={loading}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-600 outline-none transition-all shadow-xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
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
                        <KeyRound className="w-4 h-4" />
                      )
                    }
                  >
                    {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={onNavigateLogin}
                    disabled={loading}
                    className="w-full justify-center text-slate-600 hover:text-slate-900"
                  >
                    Cancelar e Voltar
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
