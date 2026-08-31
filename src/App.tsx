/**
 * @file App.tsx
 * @description Ponto de Entrada Principal, Roteador e Proteção de Autenticação Real do OrçaGraf
 * @project OrçaGraf
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TenantProvider } from './context/TenantContext';
import { NotificationProvider } from './context/NotificationContext';
import { CommercialProvider } from './context/CommercialContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { TechnicalConfigErrorPage } from './components/common/TechnicalConfigErrorPage';

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

const AuthRouteGuard: React.FC = () => {
  const { isModeConnected, isConfigured, configError, loading, user } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'forgot-password' | 'reset-password'>('login');

  // Detecta se a URL contém token de recuperação do Supabase (#access_token=...&type=recovery ou #/reset-password)
  useEffect(() => {
    const handleAuthHash = () => {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('reset-password')) {
        setAuthView('reset-password');
      }
    };
    handleAuthHash();
    window.addEventListener('hashchange', handleAuthHash);
    return () => window.removeEventListener('hashchange', handleAuthHash);
  }, []);

  // 1. Modo Standalone: Preserva funcionamento 100% livre e direto do OrçaGraf
  if (!isModeConnected) {
    return <MainRouter />;
  }

  // 2. Modo Conectado com Configuração Incompleta: Exibe tela técnica segura
  if (configError || !isConfigured) {
    return <TechnicalConfigErrorPage message={configError || 'Configuração do Supabase incompleta.'} />;
  }

  // 3. Carregando Sessão Inicial no Modo Conectado
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" role="status" aria-live="polite">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Verificando sessão de acesso...</p>
        </div>
      </div>
    );
  }

  // 4. Fluxo de Redefinição de Senha
  if (authView === 'reset-password') {
    return (
      <ResetPasswordPage
        onNavigateLogin={() => {
          window.location.hash = '';
          setAuthView('login');
        }}
        onSuccess={() => {
          window.location.hash = '';
          setAuthView('login');
        }}
      />
    );
  }

  // 5. Fluxo de Esqueci Minha Senha
  if (authView === 'forgot-password') {
    return <ForgotPasswordPage onNavigateLogin={() => setAuthView('login')} />;
  }

  // 6. Modo Conectado Sem Sessão Ativa: Exibe Login
  if (!user) {
    return (
      <LoginPage
        onNavigateForgotPassword={() => setAuthView('forgot-password')}
      />
    );
  }

  // 7. Modo Conectado Autenticado: Acesso Autorizado
  return <MainRouter />;
};

export default function App() {
  return (
    <TenantProvider>
      <NotificationProvider>
        <CommercialProvider>
          <AuthProvider>
            <AuthRouteGuard />
          </AuthProvider>
        </CommercialProvider>
      </NotificationProvider>
    </TenantProvider>
  );
}
