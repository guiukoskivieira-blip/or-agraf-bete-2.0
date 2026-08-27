/**
 * @file TechnicalConfigErrorPage.tsx
 * @description Tela Técnica de Orientação para Configuração Incompleta do Supabase no Modo Conectado
 * @project OrçaGraf
 */

import React from 'react';
import { AlertTriangle, Terminal, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { OrcaGrafLogo } from './OrcaGrafLogo';

interface TechnicalConfigErrorPageProps {
  message: string;
}

export const TechnicalConfigErrorPage: React.FC<TechnicalConfigErrorPageProps> = ({ message }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-amber-50/40 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <OrcaGrafLogo size="lg" />
          <p className="text-xs sm:text-sm text-slate-500 font-medium pt-1">
            Diagnóstico de Inicialização do Sistema
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white border border-amber-200/80 shadow-md rounded-2xl space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Ambiente Conectado Não Configurado
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {message}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2 overflow-x-auto shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-400 font-sans font-bold uppercase text-[10px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>Variáveis Requeridas no .env</span>
            </div>
            <div className="text-amber-300">VITE_PREXYON_MODE=connected</div>
            <div className="text-slate-300">VITE_SUPABASE_URL=https://seu-projeto.supabase.co</div>
            <div className="text-slate-300">VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</div>
          </div>

          <div className="text-xs text-slate-500 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p className="font-semibold text-slate-700">Como resolver:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Para executar localmente em modo demonstração, configure <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">VITE_PREXYON_MODE=standalone</code>.</li>
              <li>Para autenticação real, preencha as chaves públicas do seu projeto Supabase.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="md"
              onClick={() => window.location.reload()}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Recarregar Página
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
