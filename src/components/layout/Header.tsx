/**
 * @file Header.tsx
 * @description Cabeçalho Limpo e Funcional do OrçaGraf (Design System Ecossistema)
 * @project OrçaGraf
 */

import React from 'react';
import { Menu, PlusCircle, Bell, Search } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import { OrcaGrafLogo } from '../common/OrcaGrafLogo';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onSearchClick?: () => void;
  onNewQuote?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onSearchClick,
  onNewQuote,
  onOpenProfile,
}) => {
  const { currentUser } = useTenant();
  const { showNotice } = useNotification();

  const handleNotificationsClick = () => {
    showNotice('Avisos Comerciais', 'Nenhum alerta pendente no momento.', 'info');
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Mobile Menu trigger + Clean App Title/Logo on Mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none cursor-pointer"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden flex items-center">
          <OrcaGrafLogo size="sm" showSubtitle={false} />
        </div>
      </div>

      {/* Right side: Action, Search, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search button on mobile/desktop */}
        <button
          onClick={onSearchClick}
          className="px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none cursor-pointer shadow-xs"
          title="Pesquisa rápida"
          aria-label="Pesquisar orçamentos ou clientes"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="hidden md:inline text-slate-500">Buscar no OrçaGraf...</span>
          <kbd className="hidden md:inline text-[10px] font-mono text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
            /
          </kbd>
        </button>

        {/* Notifications Icon */}
        <button
          onClick={handleNotificationsClick}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors relative focus-visible:ring-2 focus-visible:ring-blue-500 outline-none cursor-pointer shadow-xs"
          aria-label="Ver avisos"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Primary CTA button in Header */}
        {onNewQuote && (
          <Button
            variant="primary"
            size="sm"
            onClick={onNewQuote}
            icon={<PlusCircle className="w-3.5 h-3.5" />}
            className="hidden sm:inline-flex"
          >
            Novo Orçamento
          </Button>
        )}

        {/* User profile avatar / pill (Mobile and extra header shortcut) */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-3 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer text-left"
          title="Ver perfil do usuário e dados da gráfica"
          aria-label="Perfil do usuário"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="hidden xl:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">
              {currentUser.role === 'owner' ? 'Proprietário' : currentUser.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
