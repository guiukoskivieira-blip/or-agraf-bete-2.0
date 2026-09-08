/**
 * @file HelpCenterPage.tsx
 * @description Central de Ajuda Oficial do OrçaGraf — Fundação (Etapa 1)
 * @route /help
 * @project OrçaGraf
 */

import React from 'react';
import { BookOpen, Headphones } from 'lucide-react';
import { Card } from '../components/ui/Card';

interface HelpCenterPageProps {
  onNavigate?: (tab: string) => void;
}

export const HelpCenterPage: React.FC<HelpCenterPageProps> = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho Principal */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              <span>Central de Ajuda</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Encontre orientações rápidas ou prepare um relatório para o suporte.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Base */}
      <Card className="p-8 text-center bg-white border-slate-200">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 mb-4">
          <Headphones className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Central de Ajuda OrçaGraf</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
          Encontre orientações rápidas ou prepare um relatório para o suporte.
        </p>
      </Card>
    </div>
  );
};
