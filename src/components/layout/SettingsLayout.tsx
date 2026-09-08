/**
 * @file SettingsLayout.tsx
 * @description Layout e Navegação Interna para as Páginas de Configurações do OrçaGraf
 * @project OrçaGraf
 */

import React from 'react';

export type SettingsTab = 'profile';

interface SettingsLayoutProps {
  activeTab?: SettingsTab;
  onNavigate?: (tab: SettingsTab) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-6">
      {/* Header das Configurações */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      {/* Conteúdo da Página com scroll natural */}
      <div>{children}</div>
    </div>
  );
};

