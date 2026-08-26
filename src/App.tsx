/**
 * @file App.tsx
 * @description Ponto de Entrada Principal e Roteador Completo da Aplicação OrçaGraf
 * @project OrçaGraf
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TenantProvider } from './context/TenantContext';
import { NotificationProvider } from './context/NotificationContext';
import { CommercialProvider } from './context/CommercialContext';
import { AppLayout } from './components/layout/AppLayout';
import { GeneralPage } from './pages/GeneralPage';
import { QuotesPage } from './pages/QuotesPage';
import { QuoteDetailsPage } from './pages/QuoteDetailsPage';
import { NewQuotePage } from './pages/NewQuotePage';
import { CustomersPage } from './pages/CustomersPage';
import { CatalogPage, CatalogTab } from './pages/CatalogPage';
import { MyProfilePage } from './pages/profile/MyProfilePage';
import { IntegrationsPage } from './pages/profile/IntegrationsPage';
import { UsersPermissionsPage } from './pages/profile/UsersPermissionsPage';
import { CompanyDataPage } from './pages/profile/CompanyDataPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QuickSearchModal } from './components/common/QuickSearchModal';

interface ParsedRoute {
  tab: string;
  subPath?: string;
  param?: string;
}

function parseCurrentRoute(): ParsedRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!hash || hash === 'dashboard' || hash === 'home' || hash === 'finance') {
    return { tab: 'general' };
  }

  // Tratamento de rotas com subpaths
  const parts = hash.split('/').filter(Boolean);
  const primary = parts[0]?.toLowerCase();
  const secondary = parts[1]?.toLowerCase();
  const tertiary = parts[2]?.toLowerCase();

  // /quotes/:quoteId
  if (primary === 'quotes' && secondary) {
    return { tab: 'quotes', param: parts[1] };
  }

  // /catalog/:subtab (products, supplies, finishes)
  if (primary === 'catalog') {
    if (secondary === 'supplies' || secondary === 'finishes' || secondary === 'products') {
      return { tab: 'catalog', subPath: secondary };
    }
    return { tab: 'catalog', subPath: 'products' };
  }

  // /products legado -> /catalog/products
  if (primary === 'products') {
    return { tab: 'catalog', subPath: 'products' };
  }

  // /profile/*
  if (primary === 'profile') {
    if (secondary === 'integrations') {
      return { tab: 'profile', subPath: 'integrations' };
    }
    if (secondary === 'users') {
      return { tab: 'profile', subPath: 'users' };
    }
    if (secondary === 'company') {
      return { tab: 'profile', subPath: 'company' };
    }
    return { tab: 'profile', subPath: 'profile' };
  }

  if (primary === 'general' || primary === 'quotes' || primary === 'customers' || primary === 'new-quote') {
    return { tab: primary };
  }

  return { tab: 'not-found' };
}

const MainRouter: React.FC = () => {
  const [route, setRoute] = useState<ParsedRoute>(parseCurrentRoute);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sincroniza rota com o hash da URL para navegação direta e suporte a voltar/avançar no navegador
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = useCallback((path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    window.location.hash = `#${cleanPath}`;
    setRoute(parseCurrentRoute());
  }, []);

  const renderCurrentPage = () => {
    // Rota de detalhes de orçamento: /quotes/:quoteId
    if (route.tab === 'quotes' && route.param) {
      return (
        <QuoteDetailsPage
          quoteId={route.param}
          onBack={() => navigateTo('quotes')}
        />
      );
    }

    switch (route.tab) {
      case 'general':
        return (
          <GeneralPage
            onNavigate={navigateTo}
            onNewQuote={() => navigateTo('new-quote')}
          />
        );

      case 'quotes':
        return (
          <QuotesPage
            onNewQuote={() => navigateTo('new-quote')}
            onViewQuote={quoteId => navigateTo(`quotes/${quoteId}`)}
          />
        );

      case 'new-quote':
        return (
          <NewQuotePage
            onBack={() => navigateTo('quotes')}
            onSuccess={() => navigateTo('quotes')}
          />
        );

      case 'customers':
        return <CustomersPage />;

      case 'catalog':
        return (
          <CatalogPage
            initialTab={(route.subPath as CatalogTab) || 'products'}
            onNavigateTab={tab => navigateTo(`catalog/${tab}`)}
          />
        );

      // Rotas de Configurações e Perfil em Páginas Dedicadas
      case 'profile':
        if (route.subPath === 'integrations') {
          return <IntegrationsPage onNavigateSettings={tab => navigateTo(`profile/${tab === 'profile' ? '' : tab}`)} />;
        }
        if (route.subPath === 'users') {
          return <UsersPermissionsPage onNavigateSettings={tab => navigateTo(`profile/${tab === 'profile' ? '' : tab}`)} />;
        }
        if (route.subPath === 'company') {
          return <CompanyDataPage onNavigateSettings={tab => navigateTo(`profile/${tab === 'profile' ? '' : tab}`)} />;
        }
        return <MyProfilePage onNavigateSettings={tab => navigateTo(`profile/${tab === 'profile' ? '' : tab}`)} />;

      case 'not-found':
      default:
        return <NotFoundPage onGoHome={() => navigateTo('general')} />;
    }
  };

  const getActiveLayoutTab = (): string => {
    if (route.tab === 'catalog') {
      return route.subPath ? `catalog/${route.subPath}` : 'catalog';
    }
    if (route.tab === 'profile') {
      return route.subPath && route.subPath !== 'profile' ? `profile/${route.subPath}` : 'profile';
    }
    return route.tab;
  };

  return (
    <AppLayout
      activeTab={getActiveLayoutTab()}
      onSelectTab={navigateTo}
      onNewQuote={() => navigateTo('new-quote')}
      onSearchClick={() => setIsSearchOpen(true)}
    >
      {renderCurrentPage()}

      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigateTo}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <TenantProvider>
      <NotificationProvider>
        <CommercialProvider>
          <MainRouter />
        </CommercialProvider>
      </NotificationProvider>
    </TenantProvider>
  );
}
