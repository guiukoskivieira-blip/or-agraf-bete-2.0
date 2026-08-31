import React from 'react';
import { FileText, Headphones, LayoutGrid, Tags, Users } from 'lucide-react';
import { OrcaGrafLogo } from '../common/OrcaGrafLogo';

export type NavigationTab = 'general' | 'quotes' | 'customers' | 'catalog' | 'products' | 'new-quote' | 'profile' | 'profile/integrations' | 'profile/users' | 'profile/company';
interface SidebarProps { activeTab: string; onSelectTab: (tab: string) => void; onNewQuote?: () => void }

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const items = [
    { id: 'general', label: 'Visão geral', icon: LayoutGrid },
    { id: 'quotes', label: 'Orçamentos', icon: FileText },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'catalog', label: 'Catálogo comercial', icon: Tags },
  ];
  const active = (id: string) => id === 'catalog' ? activeTab === 'catalog' || activeTab === 'products' || activeTab.startsWith('catalog/') : activeTab === id || activeTab.startsWith(`${id}/`);
  return (
    <aside className="hidden w-[292px] shrink-0 flex-col bg-gradient-to-b from-[#008c5c] via-[#009b67] to-[#00aa83] px-5 py-7 text-white shadow-xl shadow-emerald-950/10 lg:flex">
      <div className="mb-7 flex min-h-[86px] items-center"><OrcaGrafLogo size="lg" className="max-w-full" /></div>
      <nav className="flex-1 space-y-2" aria-label="Navegação principal">
        {items.map(item => { const Icon = item.icon; const isActive = active(item.id); return (
          <button key={item.id} onClick={() => onSelectTab(item.id)} className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition focus-visible:ring-2 focus-visible:ring-white ${isActive ? 'bg-white/30 text-white shadow-sm' : 'text-white/90 hover:bg-white/12 hover:text-white'}`} aria-current={isActive ? 'page' : undefined}>
            <Icon className="h-5 w-5 shrink-0" /><span>{item.label}</span>
          </button>
        ); })}
      </nav>
      <button onClick={() => onSelectTab('profile')} className="mt-8 rounded-xl border border-white/70 p-4 text-left hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white">
        <span className="flex items-center gap-3 text-sm font-semibold"><Headphones className="h-5 w-5" />Central de ajuda</span>
        <span className="mt-2 block pl-8 text-xs text-white/80">Tutoriais, artigos e suporte</span>
      </button>
    </aside>
  );
};
