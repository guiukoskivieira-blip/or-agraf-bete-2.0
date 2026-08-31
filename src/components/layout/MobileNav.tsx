import React, { useEffect } from 'react';
import { FileText, Headphones, LayoutGrid, Tags, Users, X } from 'lucide-react';
import { NavigationTab } from './Sidebar';
import { OrcaGrafLogo } from '../common/OrcaGrafLogo';

interface MobileNavProps { isOpen: boolean; onClose: () => void; activeTab: NavigationTab; onSelectTab: (tab: NavigationTab) => void; onNewQuote?: () => void; onOpenProfile?: () => void }

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose, activeTab, onSelectTab, onOpenProfile }) => {
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', close); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const items = [
    { id: 'general' as NavigationTab, label: 'Visão geral', icon: LayoutGrid },
    { id: 'quotes' as NavigationTab, label: 'Orçamentos', icon: FileText },
    { id: 'customers' as NavigationTab, label: 'Clientes', icon: Users },
    { id: 'catalog' as NavigationTab, label: 'Catálogo comercial', icon: Tags },
  ];
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navegação">
      <button className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-label="Fechar navegação" />
      <div className="relative flex h-full w-[min(86vw,330px)] flex-col bg-gradient-to-b from-[#008c5c] to-[#00aa83] p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 pb-5"><OrcaGrafLogo size="md" className="max-w-[210px]" /><button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white" aria-label="Fechar menu"><X className="h-5 w-5" /></button></div>
        <nav className="flex-1 space-y-2 pt-6">{items.map(item => { const Icon = item.icon; const selected = activeTab === item.id || (item.id === 'catalog' && activeTab === 'products'); return <button key={item.id} onClick={() => { onSelectTab(item.id); onClose(); }} className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left font-medium ${selected ? 'bg-white/30' : 'hover:bg-white/10'}`} aria-current={selected ? 'page' : undefined}><Icon className="h-5 w-5" />{item.label}</button>; })}</nav>
        <button onClick={() => { onOpenProfile?.(); onClose(); }} className="rounded-xl border border-white/60 p-4 text-left hover:bg-white/10"><span className="flex items-center gap-3 font-semibold"><Headphones className="h-5 w-5" />Central de ajuda</span><span className="mt-1 block pl-8 text-xs text-white/80">Tutoriais, artigos e suporte</span></button>
      </div>
    </div>
  );
};
