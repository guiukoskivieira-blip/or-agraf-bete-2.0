import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Menu,
  Check,
  ArrowUpRight,
  LayoutGrid,
  User,
  LogOut,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import prexyonLogo from '../../assets/prexyon-logo.png';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { getPrexyonRuntimeConfig } from '../../config/prexyon';
import { prexyonSsoClient } from '../../services/prexyon-sso-client';
import { PrexyonProductId } from '../../types/prexyon';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onSearchClick?: () => void;
  onNewQuote?: () => void;
  onOpenProfile?: () => void;
}

function formatRole(role?: string): string {
  switch (role) {
    case 'owner':
      return 'Proprietário';
    case 'admin':
      return 'Administrador';
    case 'manager':
      return 'Gestor';
    case 'sales':
      return 'Vendedor';
    case 'reception':
      return 'Balcão';
    case 'production':
      return 'Produção';
    case 'viewer':
      return 'Visualizador';
    default:
      return role || 'Membro';
  }
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenProfile }) => {
  const { currentUser, currentCompany } = useTenant();
  const { showNotice } = useNotification();
  const { signOut, isModeConnected } = useAuth();

  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitchingProduct, setIsSwitchingProduct] = useState(false);

  const productMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const runtimeConfig = getPrexyonRuntimeConfig();
  const portalUrl =
    runtimeConfig.portalUrl ||
    import.meta.env.VITE_PREXYON_PORTAL_URL ||
    'https://prexyon-production.up.railway.app';

  const initials = currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OG';

  // Fechar dropdowns em clique externo e tecla Escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (productMenuRef.current && !productMenuRef.current.contains(target)) {
        setIsProductMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProductMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Proteção contra estado stale/loading no retorno do navegador (bfcache)
  useEffect(() => {
    const handlePageShow = () => {
      setIsSwitchingProduct(false);
      setIsProductMenuOpen(false);
      setIsUserMenuOpen(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const handleSwitchProduct = async (targetProduct: PrexyonProductId) => {
    if (targetProduct === 'orcagraf') {
      setIsProductMenuOpen(false);
      return;
    }

    setIsSwitchingProduct(true);

    if (!isModeConnected) {
      showNotice(
        'Modo Demonstração',
        'A troca de produtos está disponível no ambiente conectado do Portal Prexyon.',
        'info'
      );
      setIsSwitchingProduct(false);
      setIsProductMenuOpen(false);
      return;
    }

    const targetBaseUrl =
      targetProduct === 'arteflow'
        ? runtimeConfig.productUrls.arteflow || import.meta.env.VITE_ARTEFLOW_URL
        : runtimeConfig.productUrls.artecheck || import.meta.env.VITE_ARTECHECK_URL;

    if (!targetBaseUrl) {
      showNotice(
        'Produto Não Configurado',
        `O endereço do ${targetProduct === 'arteflow' ? 'ArteFlow' : 'ArteCheck'} não foi configurado neste ambiente.`,
        'warning'
      );
      setIsSwitchingProduct(false);
      setIsProductMenuOpen(false);
      return;
    }

    try {
      const result = await prexyonSsoClient.generateProductRedirect(targetProduct, currentCompany.id);

      if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else if (result.success && result.code) {
        const cleanBaseUrl = targetBaseUrl.replace(/\/$/, '');
        window.location.href = `${cleanBaseUrl}/#/auth/prexyon?code=${result.code}`;
      } else {
        showNotice(
          'Falha na Troca de Produto',
          result.error || 'Não foi possível gerar a chave de acesso SSO para o software selecionado.',
          'error'
        );
        setIsSwitchingProduct(false);
        setIsProductMenuOpen(false);
      }
    } catch (err: any) {
      showNotice(
        'Erro na Troca de Produto',
        err.message || 'Falha de comunicação com o serviço Prexyon SSO.',
        'error'
      );
      setIsSwitchingProduct(false);
      setIsProductMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await signOut();
    window.location.href = portalUrl;
  };

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between bg-[#031225] px-4 text-white shadow-lg shadow-slate-950/10 sm:px-6 lg:px-8 border-b border-white/10 relative z-30">
      {/* Seção Esquerda: Menu Mobile, Logo Oficial, Organização/Role e Seletor de Produtos */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-white/85 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo Oficial Branca Prexyon (link para o Portal Prexyon) */}
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg"
          aria-label="Portal Prexyon"
          title="Prexyon - Tecnologia para Pequena Empresa"
        >
          <img
            src={prexyonLogo}
            alt="Prexyon"
            className="h-7 sm:h-8 w-auto object-contain"
          />
        </a>

        <div className="hidden h-8 w-px bg-white/20 md:block" />

        {/* Organização Atual + Role */}
        <div className="hidden md:flex flex-col text-left justify-center">
          <span
            className="text-sm font-semibold text-white truncate max-w-[180px] lg:max-w-[240px]"
            title={currentCompany.tradeName || currentCompany.corporateName}
          >
            {currentCompany.tradeName || currentCompany.corporateName || 'Minha Empresa'}
          </span>
          <span className="text-[11px] font-medium text-slate-300">
            {formatRole(currentUser.role)}
          </span>
        </div>

        <div className="hidden h-8 w-px bg-white/20 md:block" />

        {/* Seletor de Produtos do Ecossistema Prexyon com SSO V2 */}
        <div className="relative" ref={productMenuRef}>
          <button
            type="button"
            onClick={() => setIsProductMenuOpen(prev => !prev)}
            disabled={isSwitchingProduct}
            className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.06] px-3 sm:px-3.5 py-2 text-sm font-medium hover:bg-white/12 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
            aria-haspopup="true"
            aria-expanded={isProductMenuOpen}
            aria-label="Produto atual: OrçaGraf"
          >
            {isSwitchingProduct ? (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-400/40">
                OG
              </span>
            )}
            <span className="hidden sm:inline font-semibold">OrçaGraf</span>
            <ChevronDown
              className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
                isProductMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Funcional de Produtos */}
          {isProductMenuOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#071b33] border border-white/15 p-2 shadow-2xl z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                Ecossistema Prexyon
              </div>
              <div className="py-1 space-y-1">
                {/* OrçaGraf - Produto Atual Ativo */}
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-white/10 text-white font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-400/40">
                      OG
                    </span>
                    <div>
                      <div className="text-sm font-bold">OrçaGraf</div>
                      <div className="text-[11px] text-emerald-400 font-normal">Produto atual</div>
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>

                {/* ArteFlow */}
                <button
                  type="button"
                  onClick={() => handleSwitchProduct('arteflow')}
                  disabled={isSwitchingProduct}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/10 text-slate-200 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black border border-cyan-400/40 group-hover:border-cyan-400">
                      AF
                    </span>
                    <div>
                      <div className="text-sm font-semibold group-hover:text-white">ArteFlow</div>
                      <div className="text-[11px] text-slate-400">PCP & Produção</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>

                {/* ArteCheck */}
                <button
                  type="button"
                  onClick={() => handleSwitchProduct('artecheck')}
                  disabled={isSwitchingProduct}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/10 text-slate-200 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400 text-xs font-black border border-violet-400/40 group-hover:border-violet-400">
                      AC
                    </span>
                    <div>
                      <div className="text-sm font-semibold group-hover:text-white">ArteCheck</div>
                      <div className="text-[11px] text-slate-400">Pré-impressão & PDF</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seção Direita: Portal Prexyon e Avatar com Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Acesso ao Portal Prexyon */}
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/12 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
          title="Abrir o Portal Central Prexyon"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-sky-400" />
          <span>Portal Prexyon</span>
        </a>

        {/* Info da Organização e Usuário (Desktop) */}
        <div className="hidden sm:flex items-center gap-2.5 text-right">
          <div className="text-xs">
            <p className="font-bold text-white leading-tight truncate max-w-[150px]">
              {currentCompany.tradeName || currentCompany.corporateName}
            </p>
            <p className="text-[11px] text-slate-300 font-medium">
              {formatRole(currentUser.role)}
            </p>
          </div>
        </div>

        {/* Menu do Usuário / Avatar */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className="flex items-center gap-2 rounded-full p-0.5 text-white ring-2 ring-white/20 hover:ring-emerald-400 transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen}
            aria-label="Perfil do usuário"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 font-bold text-xs text-white">
                {initials}
              </div>
            )}
          </button>

          {/* Dropdown do Usuário */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#071b33] border border-white/15 p-2 shadow-2xl z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2.5 border-b border-white/10">
                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-300 truncate">{currentUser.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-medium text-slate-300">
                  <span className="truncate max-w-[140px]">
                    {currentCompany.tradeName || currentCompany.corporateName}
                  </span>
                  <span>•</span>
                  <span>{formatRole(currentUser.role)}</span>
                </div>
              </div>

              <div className="py-1 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenProfile?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Meu Perfil</span>
                </button>

                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <LayoutGrid className="h-4 w-4 text-sky-400" />
                    <span>Portal Prexyon</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>

                <div className="my-1 border-t border-white/10" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

