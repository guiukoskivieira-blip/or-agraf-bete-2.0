import React, { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps { activeTab: string; onSelectTab: (tab: string) => void; onNewQuote: () => void; children: ReactNode; onSearchClick?: () => void }

export const AppLayout: React.FC<AppLayoutProps> = ({ activeTab, onSelectTab, onNewQuote, children, onSearchClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openProfile = () => onSelectTab('profile');
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f7f9fb] text-slate-950 antialiased">
      <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} onSearchClick={onSearchClick} onOpenProfile={openProfile} />
      <div className="flex min-h-0 flex-1">
        <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} onNewQuote={onNewQuote} />
        <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} activeTab={activeTab as any} onSelectTab={onSelectTab} onNewQuote={onNewQuote} onOpenProfile={openProfile} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafb] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
