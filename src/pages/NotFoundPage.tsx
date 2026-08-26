import React from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900">Módulo ou Página Não Encontrada</h2>
      <p className="text-sm text-slate-500 max-w-md">
        A rota solicitada não existe ou não faz parte dos módulos comerciais do OrçaGraf.
      </p>
      <div className="pt-2">
        <Button variant="primary" onClick={onGoHome} icon={<FileText className="w-4 h-4" />}>
          Voltar para Orçamentos
        </Button>
      </div>
    </div>
  );
};
