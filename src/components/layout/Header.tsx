import React from 'react';
import { Bell, ChevronDown, CircleHelp, Menu, Settings } from 'lucide-react';
import prexyonLogo from '../../assets/prexyon-logo.png';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';

interface HeaderProps { onOpenMobileMenu: () => void; onSearchClick?: () => void; onNewQuote?: () => void; onOpenProfile?: () => void }

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenProfile }) => {
  const { currentUser } = useTenant();
  const { showNotice } = useNotification();
  const initials = currentUser.name.slice(0, 2).toUpperCase();
  const unavailable = (label: string) => showNotice(label, 'Este recurso ainda não está configurado.', 'info');

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between bg-[#031225] px-4 text-white shadow-lg shadow-slate-950/10 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <button onClick={onOpenMobileMenu} className="rounded-lg p-2 text-white/85 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden" aria-label="Abrir navegação"><Menu className="h-5 w-5" /></button>
        <span className="rounded-lg bg-white px-2 py-1"><img src={prexyonLogo} alt="Prexyon" className="h-7 w-[120px] object-contain object-left sm:h-8 sm:w-[138px]" /></span>
        <div className="hidden h-8 w-px bg-white/25 md:block" />
        <button type="button" onClick={() => unavailable('Minha empresa')} className="hidden items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 md:flex">
          Minha empresa <ChevronDown className="h-4 w-4" />
        </button>
        <button type="button" className="hidden items-center gap-3 rounded-xl border border-white/25 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold shadow-inner hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 sm:flex" aria-label="Produto selecionado: OrçaGraf">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/70 bg-emerald-500/15 text-xs font-black text-emerald-400">OG</span>
          <span>OrçaGraf</span><ChevronDown className="h-4 w-4 text-white/75" />
        </button>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={() => unavailable('Ajuda')} className="hidden rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 lg:block">Ajuda</button>
        <button onClick={() => unavailable('Central de ajuda')} className="rounded-full p-2 text-white/90 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Central de ajuda"><CircleHelp className="h-6 w-6" /></button>
        <button onClick={() => showNotice('Notificações', 'Nenhuma notificação pendente.', 'info')} className="relative rounded-full p-2 text-white/90 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Notificações"><Bell className="h-6 w-6" /></button>
        <button onClick={onOpenProfile} className="hidden rounded-full p-2 text-white/90 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 sm:block" aria-label="Configurações"><Settings className="h-6 w-6" /></button>
        <button onClick={onOpenProfile} className="hidden sm:flex items-center gap-2.5 ml-1 h-10 w-10 justify-center rounded-full bg-white font-bold text-slate-900 ring-2 ring-white/10 hover:ring-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Perfil do usuário" title={`Perfil de ${currentUser.name}`}>{initials}</button>
      </div>
    </header>
  );
};
