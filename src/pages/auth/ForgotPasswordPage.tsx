/**
 * @file ForgotPasswordPage.tsx
 * @description Tela de Solicitação de Recuperação de Senha por E-mail
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OrcaGrafLogo } from '../../components/common/OrcaGrafLogo';

interface ForgotPasswordPageProps {
  onNavigateLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateLogin }) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Informe seu e-mail cadastrado.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(trimmedEmail);
      // Sempre exibe mensagem de sucesso para não revelar se o e-mail existe na base (proteção contra enumeração)
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/40 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <OrcaGrafLogo size="lg" />
          <p className="text-xs sm:text-sm text-slate-500 font-medium pt-1">
            Recuperação de Acesso
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white border border-slate-200/80 shadow-md rounded-2xl">
          {submitted ? (
            <div className="space-y-6 text-center" role="status" aria-live="polite">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Verifique seu e-mail</h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Se o endereço informado estiver cadastrado no sistema, você receberá um link com instruções seguras para redefinir sua senha.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onNavigateLogin}
                  icon={<ArrowLeft className="w-4 h-4" />}
                  className="w-full justify-center text-sm font-semibold"
                >
                  Voltar para o Login
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Recuperar Senha</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Informe o e-mail da sua conta para enviarmos o link de redefinição.
                </p>
              </div>

              {error && (
                <div
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    E-mail Cadastrado
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isSubmitting}
                      placeholder="seu.email@grafica.com.br"
                      autoComplete="email"
                      required
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 outline-none transition-all shadow-xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full justify-center text-sm font-semibold"
                    icon={
                      isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )
                    }
                  >
                    {isSubmitting ? 'Enviando link...' : 'Enviar link de recuperação'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={onNavigateLogin}
                    disabled={isSubmitting}
                    icon={<ArrowLeft className="w-4 h-4" />}
                    className="w-full justify-center text-slate-600 hover:text-slate-900"
                  >
                    Voltar para o Login
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
