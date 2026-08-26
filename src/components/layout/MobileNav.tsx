/**
 * @file MobileNav.tsx
 * @description Drawer de Navegação Mobile Responsivo e Fluido (Light Theme)
 * @project OrçaGraf
 */

import React, { useEffect } from 'react';
import {
  Users,
  Layers,
  FileText,
  X,
  PlusCircle,
  LayoutGrid,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { NavigationTab } from './Sidebar';
import { OrcaGrafLogo } from '../common/OrcaGrafLogo';
import { useTenant } from '../../context/TenantContext';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onNewQuote?: () => void;
  onOpenProfile?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onNewQuote,
  onOpenProfile,
}) => {
  const { currentUser, currentCompany } = useTenant();

  const navItems = [
    { id: 'general' as NavigationTab, label: 'Página Geral', icon: LayoutGrid },
    { id: 'quotes' as NavigationTab, label: 'Orçamentos', icon: FileText },
    { id: 'customers' as NavigationTab, label: 'Clientes', icon: Users },
    { id: 'products' as NavigationTab, label: 'Produtos & Insumos', icon: Layers },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNewQuoteClick = () => {
    onClose();
    if (onNewQuote) {
      onNewQuote();
    } else {
      onSelectTab('new-quote');
    }
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop com desfoque */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-300">
        {/* Header com Logo e Botão Fechar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <OrcaGrafLogo size="sm" />
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botão Novo Orçamento */}
        <div className="p-4 pb-2">
          <button
            onClick={handleNewQuoteClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Orçamento</span>
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Menu Mobile">
          <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Módulos
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

          {/* Ecossistema */}
          <div className="pt-6 mt-4 border-t border-slate-100 px-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>Ecossistema</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">ArteCheck</span>
                <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
                  Pré-impressão • Em breve
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-medium text-slate-700">ArteFlow</span>
                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                  Produção & PCP • Em breve
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Perfil no Rodapé do Mobile Nav com Foto */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/60">
          <button
            onClick={() => {
              onClose();
              if (onOpenProfile) onOpenProfile();
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{currentCompany.tradeName}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
