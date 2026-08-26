/**
 * @file SettingsLayout.tsx
 * @description Layout e Navegação Interna para as Páginas de Configurações do OrçaGraf
 * @project OrçaGraf
 */

import React from 'react';
import {
  User as UserIcon,
  MessageSquare,
  Shield,
  Building2,
  Lock,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export type SettingsTab = 'profile' | 'integrations' | 'users' | 'company';

interface SettingsLayoutProps {
  activeTab: SettingsTab;
  onNavigate: (tab: SettingsTab) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  activeTab,
  onNavigate,
  title,
  description,
  children,
}) => {
  const { currentUser, checkPermission } = useTenant();

  const isOwnerOrAdmin = currentUser.role === 'owner' || currentUser.role === 'admin';
  const canManageUsers = isOwnerOrAdmin || checkPermission('users_permissions', 'view');
  const canManageCompany = isOwnerOrAdmin || checkPermission('settings', 'view');
  const canManageIntegrations = isOwnerOrAdmin || checkPermission('integrations', 'view');

  const navItems = [
    {
      id: 'profile' as SettingsTab,
      label: 'Meu Perfil',
      icon: UserIcon,
      allowed: true,
      path: '/profile',
    },
    {
      id: 'integrations' as SettingsTab,
      label: 'Integrações',
      icon: MessageSquare,
      allowed: canManageIntegrations,
      path: '/profile/integrations',
    },
    {
      id: 'users' as SettingsTab,
      label: 'Usuários e Permissões',
      icon: Shield,
      allowed: canManageUsers,
      path: '/profile/users',
    },
    {
      id: 'company' as SettingsTab,
      label: 'Dados da Gráfica',
      icon: Building2,
      allowed: canManageCompany,
      path: '/profile/company',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header das Configurações */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>

        {/* Abas Superiores de Navegação Interna de Configurações */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-2 border-t border-slate-100 scrollbar-none">
          {navItems.map(item => {
            if (!item.allowed) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Página com scroll natural */}
      <div>{children}</div>
    </div>
  );
};
