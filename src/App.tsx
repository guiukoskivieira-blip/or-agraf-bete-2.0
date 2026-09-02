/**
 * @file App.tsx
 * @description Ponto de Entrada Principal, Roteador e Proteção de Autenticação Real do OrçaGraf com Suporte a SSO Prexyon
 * @project OrçaGraf
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { TenantProvider, useTenant } from './context/TenantContext';
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
import { SsoCallbackPage } from './pages/auth/SsoCallbackPage';
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

const AccessDeniedView: React.FC<{ message: string; onGoBack: () => void }> = ({
  message,
  onGoBack,
}) => {
  return (
    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-12 space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Acesso Restrito</h2>
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{message}</p>
      <div className="pt-2">
        <button
          onClick={onGoBack}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
};

const MainRouter: React.FC = () => {
  const [route, setRoute] = useState<ParsedRoute>(parseCurrentRoute);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { currentUser, checkPermission } = useTenant();

  const navigateTo = useCallback((path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    window.location.hash = `#${cleanPath}`;
    setRoute(parseCurrentRoute());
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseCurrentRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderCurrentPage = () => {
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

      case 'catalog': {
        const canViewCatalog =
          currentUser.role === 'owner' ||
          currentUser.role === 'admin' ||
          checkPermission('products', 'view') ||
          checkPermission('general', 'view');

        if (!canViewCatalog) {
          return (
            <AccessDeniedView
              message="Você não possui permissão para visualizar o catálogo de produtos e precificação."
              onGoBack={() => navigateTo('general')}
            />
          );
        }

        return (
          <CatalogPage
            initialTab={(route.subPath as CatalogTab) || 'products'}
            onNavigateTab={tab => navigateTo(`catalog/${tab}`)}
          />
        );
      }

      case 'profile':
        if (route.subPath === 'integrations') {
          const canIntegrations =
            currentUser.role === 'owner' ||
            currentUser.role === 'admin' ||
            checkPermission('integrations', 'view');

          if (!canIntegrations) {
            return (
              <AccessDeniedView
                message="Você não possui permissão para gerenciar as configurações e integrações desta organização."
                onGoBack={() => navigateTo('general')}
              />
            );
          }
          return <IntegrationsPage onNavigateSettings={tab => navigateTo(`profile/${tab === 'profile' ? '' : tab}`)} />;
        }

        if (route.subPath === 'users') {
          const canUsers =
            currentUser.role === 'owner' ||
            currentUser.role === 'admin' ||
            checkPermission('users_permissions', 'view');

          if (!canUsers) {
            return (
              <AccessDeniedView
                message="Você não possui permissão para gerenciar os usuários e permissões da gráfica."
                onGoBack={() => navigateTo('general')}
              />
            );
          }
          return <UsersPermissionsPage onNavigateSettings={tab => navigateTo(`profile/${tab === 'profile' ? '' : tab}`)} />;
        }

        if (route.subPath === 'company') {
          const canCompany =
            currentUser.role === 'owner' ||
            currentUser.role === 'admin' ||
            checkPermission('settings', 'view');

          if (!canCompany) {
            return (
              <AccessDeniedView
                message="Você não possui permissão para acessar os dados fiscais e cadastrais da gráfica."
                onGoBack={() => navigateTo('general')}
              />
            );
          }
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
  const { isModeConnected, isConfigured, configError, loading, user, signOut } = useAuth();
  const { tenantStatus, tenantError, reloadTenantBootstrap } = useTenant();
  const [authView, setAuthView] = useState<'login' | 'forgot-password' | 'reset-password' | 'sso-callback'>('login');

  // Detecta se a URL contém SSO callback (/auth/prexyon?code=... ou ?code=...) ou reset token
  useEffect(() => {
    const handleAuthRouting = () => {
      const search = window.location.search || '';
      const pathname = window.location.pathname || '';
      const hash = window.location.hash || '';

      // 1. Detecção de Callback de SSO Prexyon
      if (
        pathname.includes('/auth/prexyon') ||
        hash.includes('auth/prexyon') ||
        search.includes('code=') ||
        hash.includes('code=')
      ) {
        setAuthView('sso-callback');
        return;
      }

      // 2. Detecção de Recuperação de Senha
      if (hash.includes('type=recovery') || hash.includes('reset-password')) {
        setAuthView('reset-password');
        return;
      }
    };

    handleAuthRouting();
    window.addEventListener('hashchange', handleAuthRouting);
    return () => window.removeEventListener('hashchange', handleAuthRouting);
  }, []);

  // 1. Rota de Callback SSO Prexyon (Executa tanto em modo conectado quanto standalone)
  if (authView === 'sso-callback') {
    return (
      <SsoCallbackPage
        onSuccess={() => {
          setAuthView('login');
          window.location.hash = '#general';
        }}
        onNavigateLogin={() => {
          setAuthView('login');
          window.location.hash = '';
        }}
      />
    );
  }

  // 2. Modo Standalone: Preserva funcionamento 100% livre e direto do OrçaGraf
  if (!isModeConnected) {
    return <MainRouter />;
  }

  // 3. Modo Conectado com Configuração Incompleta: Exibe tela técnica segura
  if (configError || !isConfigured) {
    return <TechnicalConfigErrorPage message={configError || 'Configuração do Supabase incompleta.'} />;
  }

  // 4. Carregando Sessão Inicial no Modo Conectado
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

  // 5. Fluxo de Redefinição de Senha
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

  // 6. Fluxo de Esqueci Minha Senha
  if (authView === 'forgot-password') {
    return <ForgotPasswordPage onNavigateLogin={() => setAuthView('login')} />;
  }

  // 7. Modo Conectado Sem Sessão Ativa: Exibe Login
  if (!user) {
    return (
      <LoginPage
        onNavigateForgotPassword={() => setAuthView('forgot-password')}
      />
    );
  }

  // 8. Modo Conectado Autenticado: Validação Autoritativa do Tenant e Permissões
  if (tenantStatus === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" role="status" aria-live="polite">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Carregando permissões e dados da organização...</p>
        </div>
      </div>
    );
  }

  if (tenantStatus === 'UNAUTHORIZED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-rose-50/30 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-rose-200/80 shadow-md rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Acesso Não Autorizado</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {tenantError || 'Sua conta de usuário não possui membresia ativa nesta organização do OrçaGraf.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                const portalUrl = import.meta.env.VITE_PREXYON_PORTAL_URL || 'https://prexyon-production.up.railway.app';
                window.location.href = portalUrl;
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Voltar ao Portal Prexyon
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
            >
              Trocar de Conta (Sair)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tenantStatus === 'ERROR') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-rose-50/30 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-rose-200/80 shadow-md rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Falha ao Carregar Organização</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {tenantError || 'Não foi possível obter os dados da organização a partir do servidor central.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => reloadTenantBootstrap()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
            >
              Sair da Sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 9. Modo Conectado e Autorizado: Acesso Autorizado
  return <MainRouter />;
};

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <NotificationProvider>
          <CommercialProvider>
            <AuthRouteGuard />
          </CommercialProvider>
        </NotificationProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
