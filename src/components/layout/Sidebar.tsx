/**
 * @file Sidebar.tsx
 * @description Menu Lateral Oficial do OrçaGraf com Design System Light (ArteCheck) e Logo Oficial
 * @project OrçaGraf
 */

import React from 'react';
import {
  Users,
  Layers,
  FileText,
  PlusCircle,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  Settings,
} from 'lucide-react';
import { OrcaGrafLogo } from '../common/OrcaGrafLogo';
import { useTenant } from '../../context/TenantContext';

export type NavigationTab =
  | 'general'
  | 'quotes'
  | 'customers'
  | 'catalog'
  | 'new-quote'
  | 'profile'
  | 'profile/integrations'
  | 'profile/users'
  | 'profile/company';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onNewQuote?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNewQuote,
}) => {
  const { currentUser, currentCompany } = useTenant();

  const navItems = [
    { id: 'general', label: 'Página Geral', icon: LayoutGrid },
    { id: 'quotes', label: 'Orçamentos', icon: FileText },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'catalog', label: 'Catálogo Comercial', icon: Layers },
  ];

  const handleNewQuoteClick = () => {
    if (onNewQuote) {
      onNewQuote();
    } else {
      onSelectTab('new-quote');
    }
  };

  const isCatalogActive =
    activeTab === 'catalog' ||
    activeTab === 'products' ||
    activeTab.startsWith('catalog/');

  const isProfileActive = activeTab.startsWith('profile');

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-white border-r border-slate-200 shrink-0 sticky top-0 z-20">
      {/* Brand Header com Logo Oficial Centralizado sem textos adicionais */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-center">
        <OrcaGrafLogo size="lg" />
      </div>

      {/* Primary Action Button */}
      <div className="p-4 pb-2">
        <button
          onClick={handleNewQuoteClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none border border-blue-600/30 active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Navegação Principal">
        <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Módulos Comerciais
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            item.id === 'catalog'
              ? isCatalogActive
              : item.id === 'quotes'
              ? activeTab === 'quotes' || activeTab.startsWith('quotes/')
              : activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
                isActive
                  ? 'bg-blue-50/80 text-blue-700 font-semibold shadow-xs border border-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

        {/* Ecosystem Suite Links */}
        <div className="pt-6 mt-4 border-t border-slate-100 px-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <Sparkles className="w-3 h-3 text-teal-600" />
            <span>Ecossistema</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
              <span className="font-medium text-slate-700">ArteCheck</span>
              <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
                Pré-impressão
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
              <span className="font-medium text-slate-700">ArteFlow</span>
              <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                Produção & PCP
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Perfil do Usuário / Configurações que abre a rota /profile */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <button
          onClick={() => onSelectTab('profile')}
          className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left group cursor-pointer ${
            isProfileActive
              ? 'bg-white shadow-xs border-blue-200 text-blue-700'
              : 'hover:bg-white hover:shadow-xs border-transparent hover:border-slate-200'
          }`}
          title="Ver Meu Perfil e Configurações"
          aria-label="Meu Perfil"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate capitalize">
                {currentUser.role} • {currentCompany.tradeName}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
        </button>
      </div>
    </aside>
  );
};
