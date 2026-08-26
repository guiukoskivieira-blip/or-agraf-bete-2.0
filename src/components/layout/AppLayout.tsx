/**
 * @file AppLayout.tsx
 * @description Layout Principal da Aplicação OrçaGraf (Design System Ecossistema)
 * @project OrçaGraf
 */

import React, { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onNewQuote: () => void;
  children: ReactNode;
  onSearchClick?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  onNewQuote,
  children,
  onSearchClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenProfile = () => {
    onSelectTab('profile');
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onNewQuote={onNewQuote}
      />

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeTab={activeTab as any}
        onSelectTab={onSelectTab}
        onNewQuote={onNewQuote}
        onOpenProfile={handleOpenProfile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSearchClick={onSearchClick}
          onNewQuote={onNewQuote}
          onOpenProfile={handleOpenProfile}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
