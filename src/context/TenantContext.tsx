/**
 * @file TenantContext.tsx
 * @description Contexto de Sessão, Multi-Tenancy, Gestão de Usuários, Foto de Perfil e Integração WhatsApp
 * @project OrçaGraf
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Company,
  User,
  UserRole,
  BaseProfile,
  UserPermissions,
  PermissionModule,
  PermissionAction,
  PermissionAuditLog,
  WhatsAppIntegration,
  ADMIN_PERMISSIONS,
  RECEPTION_PERMISSIONS,
  SALES_PERMISSIONS,
  PRODUCTION_PERMISSIONS,
  MANAGER_PERMISSIONS,
  getDefaultPermissionsForProfile,
  hasUserPermission,
} from '../types/tenant';
import { WhatsAppIntegrationService } from '../services/whatsapp-integration.service';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'emp_alphaprint_01',
    tradeName: 'Alpha Print Express & Visual',
    corporateName: 'Alpha Print Soluções Gráficas Ltda',
    document: '12.345.678/0001-90',
    stateRegistration: '123.456.789.000',
    email: 'comercial@alphaprint.com.br',
    phone: '(11) 3456-7890',
    whatsapp: '(11) 98765-4321',
    website: 'https://alphaprint.com.br',
    managerName: 'Carlos Henrique Silva',
    address: {
      street: 'Av. Industrial',
      number: '1450',
      complement: 'Galpão 03',
      neighborhood: 'Distrito Gráfico',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-000',
    },
    branding: {
      primaryColor: '#2563eb', // Blue-600
      secondaryColor: '#0d9488', // Teal-600
      accentColor: '#4f46e5', // Indigo-600
      showLogoInQuotes: true,
    },
    customization: {
      headerNote: 'Proposta comercial para impressão gráfica e comunicação visual.',
      footerDisclaimer: 'Garantia contra defeitos de fabricação de até 30 dias. Produção iniciada após aprovação técnica.',
      defaultPaymentTerms: '50% de entrada no pedido e 50% na retirada (Pix, Cartão ou Boleto)',
      defaultProductionDays: 3,
      commercialNotes: 'Preços calculados para arquivos fechados conforme gabarito técnico.',
      showTechnicalDetailsToCustomer: true,
    },
    whatsappConfig: {
      status: 'connected',
      phoneNumber: '(11) 98765-4321',
      accountName: 'Alpha Print Atendimento Oficial',
      phoneNumberId: 'phone_num_alpha_101',
      businessAccountId: 'waba_acc_alpha_99',
      apiVersion: 'v21.0',
      lastSyncAt: '2026-02-20T10:00:00Z',
      preferences: {
        allowQuotePdfReport: true,
        attachPdf: true,
        notifyOnApproved: true,
        notifyArteFlowUpdates: true,
        sendMode: 'with_confirmation',
      },
    },
    settings: {
      currency: 'BRL',
    },
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-02-01T14:30:00Z',
  },
  {
    id: 'emp_visualmax_02',
    tradeName: 'VisualMax Grandes Formatos',
    corporateName: 'VisualMax Comunicação Visual Eireli',
    document: '98.765.432/0001-10',
    stateRegistration: '987.654.321.000',
    email: 'contato@visualmax.com.br',
    phone: '(41) 3210-9876',
    whatsapp: '(41) 99123-4567',
    website: 'https://visualmax.com.br',
    managerName: 'Mariana Duarte Souza',
    address: {
      street: 'Rua dos Comunicadores',
      number: '230',
      neighborhood: 'Batel',
      city: 'Curitiba',
      state: 'PR',
      zipCode: '80000-000',
    },
    branding: {
      primaryColor: '#2563eb',
      secondaryColor: '#0d9488',
      accentColor: '#4f46e5',
      showLogoInQuotes: true,
    },
    customization: {
      headerNote: 'Orçamento especializado em grandes formatos, lonas e placas.',
      footerDisclaimer: 'Instalação e acabamentos especiais inclusos conforme detalhamento da proposta.',
      defaultPaymentTerms: 'Boleto faturado 15/30 dias para PJ cadastrado',
      defaultProductionDays: 5,
      commercialNotes: 'Valores sujeitos a alteração em caso de metragem diferente da vistoria inicial.',
      showTechnicalDetailsToCustomer: true,
    },
    whatsappConfig: {
      status: 'not_configured',
      preferences: {
        allowQuotePdfReport: true,
        attachPdf: true,
        notifyOnApproved: true,
        notifyArteFlowUpdates: false,
        sendMode: 'with_confirmation',
      },
    },
    settings: {
      currency: 'BRL',
    },
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-10T11:00:00Z',
  },
];

const INITIAL_USERS_MAP: Record<string, User[]> = {
  emp_alphaprint_01: [
    {
      id: 'usr_owner_01',
      tenantId: 'emp_alphaprint_01',
      name: 'Carlos Henrique Silva',
      email: 'carlos@alphaprint.com.br',
      role: 'owner',
      baseProfile: 'admin',
      permissions: JSON.parse(JSON.stringify(ADMIN_PERMISSIONS)),
      isActive: true,
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T14:30:00Z',
    },
    {
      id: 'usr_sales_01',
      tenantId: 'emp_alphaprint_01',
      name: 'Beatriz Lima (Comercial)',
      email: 'beatriz@alphaprint.com.br',
      role: 'sales',
      baseProfile: 'sales',
      permissions: JSON.parse(JSON.stringify(SALES_PERMISSIONS)),
      isActive: true,
      createdAt: '2026-01-15T11:00:00Z',
      updatedAt: '2026-02-01T14:30:00Z',
    },
    {
      id: 'usr_rec_01',
      tenantId: 'emp_alphaprint_01',
      name: 'Juliana Mendes (Recepção)',
      email: 'balcao@alphaprint.com.br',
      role: 'reception',
      baseProfile: 'reception',
      permissions: JSON.parse(JSON.stringify(RECEPTION_PERMISSIONS)),
      isActive: true,
      createdAt: '2026-01-20T08:30:00Z',
      updatedAt: '2026-02-01T14:30:00Z',
    },
    {
      id: 'usr_prod_01',
      tenantId: 'emp_alphaprint_01',
      name: 'Roberto Santos (Produção)',
      email: 'pcp@alphaprint.com.br',
      role: 'production',
      baseProfile: 'production',
      permissions: JSON.parse(JSON.stringify(PRODUCTION_PERMISSIONS)),
      isActive: true,
      createdAt: '2026-01-22T09:00:00Z',
      updatedAt: '2026-02-01T14:30:00Z',
    },
  ],
  emp_visualmax_02: [
    {
      id: 'usr_owner_02',
      tenantId: 'emp_visualmax_02',
      name: 'Mariana Duarte Souza',
      email: 'mariana@visualmax.com.br',
      role: 'owner',
      baseProfile: 'admin',
      permissions: JSON.parse(JSON.stringify(ADMIN_PERMISSIONS)),
      isActive: true,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-02-10T11:00:00Z',
    },
  ],
};

interface TenantContextValue {
  tenantId: string;
  currentCompany: Company;
  currentUser: User;
  companyUsers: User[];
  auditLogs: PermissionAuditLog[];
  availableCompanies: Company[];
  
  // Ações de Empresa e Configurações
  updateCompanySettings: (updates: Partial<Company>) => void;
  updateWhatsAppConfig: (updates: Partial<WhatsAppIntegration>) => void;
  testWhatsAppConnection: (tempConfig?: Partial<WhatsAppIntegration>) => Promise<{ success: boolean; message: string }>;
  disconnectWhatsApp: () => void;

  // Ações de Usuário e Foto
  updateUserProfile: (dataOrUserId: any, optionalData?: { name?: string; email?: string; avatarUrl?: string }) => void;

  // Gestão Administrativa de Usuários
  createUser: (userData: { name: string; email: string; baseProfile: BaseProfile; permissions?: UserPermissions }) => { success: boolean; error?: string };
  updateUser: (userId: string, updates: Partial<Pick<User, 'name' | 'email' | 'baseProfile'>>) => { success: boolean; error?: string };
  updateUserPermissions: (userId: string, permissions: UserPermissions, baseProfile?: BaseProfile) => { success: boolean; error?: string };
  toggleUserActiveStatus: (userId: string) => { success: boolean; error?: string };
  terminateUserSession: (userId: string) => { success: boolean; error?: string };
  checkPermission: (module: PermissionModule, action: PermissionAction) => boolean;

  // Alternância controlada de teste/simulação
  switchUser: (userId: string) => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [currentCompanyId, setCurrentCompanyId] = useState<string>('emp_alphaprint_01');
  const [usersMap, setUsersMap] = useState<Record<string, User[]>>(INITIAL_USERS_MAP);
  const [currentUserId, setCurrentUserId] = useState<string>('usr_owner_01');
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([
    {
      id: 'log_init_01',
      tenantId: 'emp_alphaprint_01',
      performedByUserId: 'usr_owner_01',
      performedByUserName: 'Carlos Henrique Silva',
      targetUserId: 'usr_sales_01',
      targetUserName: 'Beatriz Lima (Comercial)',
      timestamp: '2026-02-15T09:00:00Z',
      actionType: 'permissions_updated',
      description: 'Perfil comercial configurado com permissão para aplicar descontos e gerar orçamentos.',
    },
  ]);

  const currentCompany = companies.find(c => c.id === currentCompanyId) || companies[0];
  const companyUsers = usersMap[currentCompanyId] || [];
  const currentUser = companyUsers.find(u => u.id === currentUserId) || companyUsers[0] || {
    id: 'usr_fallback',
    tenantId: currentCompanyId,
    name: 'Administrador',
    email: 'admin@alphaprint.com.br',
    role: 'admin',
    baseProfile: 'admin',
    permissions: ADMIN_PERMISSIONS,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const addAuditLog = (
    targetUser: User,
    actionType: PermissionAuditLog['actionType'],
    description: string,
    details?: Record<string, any>
  ) => {
    const newLog: PermissionAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: currentCompanyId,
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      timestamp: new Date().toISOString(),
      actionType,
      description,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const updateCompanySettings = (updates: Partial<Company>) => {
    setCompanies(prev =>
      prev.map(comp => (comp.id === currentCompanyId ? { ...comp, ...updates, updatedAt: new Date().toISOString() } : comp))
    );
  };

  const updateWhatsAppConfig = (updates: Partial<WhatsAppIntegration>) => {
    setCompanies(prev =>
      prev.map(comp => {
        if (comp.id !== currentCompanyId) return comp;
        const currentWp = comp.whatsappConfig || {
          status: 'not_configured',
          preferences: {
            allowQuotePdfReport: true,
            attachPdf: true,
            notifyOnApproved: true,
            notifyArteFlowUpdates: true,
            sendMode: 'with_confirmation',
          },
        };

        const updatedWp: WhatsAppIntegration = {
          ...currentWp,
          ...updates,
          preferences: {
            ...currentWp.preferences,
            ...(updates.preferences || {}),
          },
        };

        return {
          ...comp,
          whatsappConfig: updatedWp,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const testWhatsAppConnection = async (tempConfig?: Partial<WhatsAppIntegration>): Promise<{ success: boolean; message: string }> => {
    const targetConfig = tempConfig || currentCompany.whatsappConfig || {};
    const result = await WhatsAppIntegrationService.testConnection(targetConfig);

    if (result.success) {
      updateWhatsAppConfig({
        status: 'connected',
        accountName: result.accountName || 'WhatsApp Comercial Oficial',
        lastSyncAt: new Date().toISOString(),
        errorMessage: undefined,
      });
    } else {
      updateWhatsAppConfig({
        status: 'error',
        errorMessage: result.message,
      });
    }

    return result;
  };

  const disconnectWhatsApp = () => {
    updateWhatsAppConfig({
      status: 'not_configured',
      phoneNumber: undefined,
      accountName: undefined,
      phoneNumberId: undefined,
      businessAccountId: undefined,
      lastSyncAt: undefined,
      errorMessage: undefined,
    });
  };

  const updateUserProfile = (dataOrUserId: any, optionalData?: { name?: string; email?: string; avatarUrl?: string }) => {
    let targetId = currentUserId;
    let payload: { name?: string; email?: string; avatarUrl?: string } = {};

    if (typeof dataOrUserId === 'string') {
      targetId = dataOrUserId;
      payload = optionalData || {};
    } else if (dataOrUserId && typeof dataOrUserId === 'object') {
      payload = dataOrUserId;
      if (typeof optionalData === 'string') {
        targetId = optionalData;
      }
    }

    setUsersMap(prev => {
      const currentList = prev[currentCompanyId] || [];
      const updatedList = currentList.map(u => {
        if (u.id === targetId) {
          return {
            ...u,
            name: payload.name !== undefined ? payload.name : u.name,
            email: payload.email !== undefined ? payload.email : u.email,
            avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : u.avatarUrl,
            updatedAt: new Date().toISOString(),
          };
        }
        return u;
      });
      return { ...prev, [currentCompanyId]: updatedList };
    });
  };

  const checkPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    return hasUserPermission(currentUser, module, action);
  };

  const createUser = (userData: {
    name: string;
    email: string;
    baseProfile: BaseProfile;
    permissions?: UserPermissions;
  }): { success: boolean; error?: string } => {
    if (!checkPermission('users_permissions', 'create') && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Acesso negado: sem permissão para criar usuários.' };
    }

    const currentList = usersMap[currentCompanyId] || [];
    const exists = currentList.some(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (exists) {
      return { success: false, error: 'Já existe um usuário cadastrado com este e-mail na empresa.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: currentCompanyId,
      name: userData.name,
      email: userData.email,
      role: userData.baseProfile as UserRole,
      baseProfile: userData.baseProfile,
      permissions: userData.permissions || getDefaultPermissionsForProfile(userData.baseProfile),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUsersMap(prev => ({
      ...prev,
      [currentCompanyId]: [...(prev[currentCompanyId] || []), newUser],
    }));

    addAuditLog(newUser, 'user_created', `Usuário ${newUser.name} criado com perfil base ${newUser.baseProfile}.`);
    return { success: true };
  };

  const updateUser = (
    userId: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'baseProfile'>>
  ): { success: boolean; error?: string } => {
    if (!checkPermission('users_permissions', 'edit') && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Acesso negado: sem permissão para editar usuários.' };
    }

    let targetUser: User | undefined;
    setUsersMap(prev => {
      const currentList = prev[currentCompanyId] || [];
      const updatedList = currentList.map(u => {
        if (u.id === userId) {
          targetUser = { ...u, ...updates, updatedAt: new Date().toISOString() };
          return targetUser;
        }
        return u;
      });
      return { ...prev, [currentCompanyId]: updatedList };
    });

    if (targetUser) {
      addAuditLog(targetUser, 'user_updated', `Dados cadastrais do usuário ${targetUser.name} foram atualizados.`);
    }

    return { success: true };
  };

  const updateUserPermissions = (
    userId: string,
    permissions: UserPermissions,
    baseProfile?: BaseProfile
  ): { success: boolean; error?: string } => {
    if (!checkPermission('users_permissions', 'edit') && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Acesso negado: sem permissão para alterar permissões.' };
    }

    const currentList = usersMap[currentCompanyId] || [];
    const targetUser = currentList.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    // Proteção de segurança: Não permitir remover permissão admin do último administrador ativo
    const isAdmin = targetUser.baseProfile === 'admin' || targetUser.role === 'owner' || targetUser.role === 'admin';
    const isDemoting = baseProfile && baseProfile !== 'admin';
    if (isAdmin && isDemoting) {
      const otherAdmins = currentList.filter(
        u => u.id !== userId && u.isActive && (u.baseProfile === 'admin' || u.role === 'owner' || u.role === 'admin')
      );
      if (otherAdmins.length === 0) {
        return { success: false, error: 'Operação bloqueada: A empresa deve manter pelo menos um Administrador ativo.' };
      }
    }

    setUsersMap(prev => {
      const list = prev[currentCompanyId] || [];
      const updated = list.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            permissions,
            baseProfile: baseProfile || u.baseProfile,
            role: (baseProfile || u.baseProfile) as UserRole,
            updatedAt: new Date().toISOString(),
          };
        }
        return u;
      });
      return { ...prev, [currentCompanyId]: updated };
    });

    addAuditLog(targetUser, 'permissions_updated', `Permissões de acesso de ${targetUser.name} foram reconfiguradas.`);
    return { success: true };
  };

  const toggleUserActiveStatus = (userId: string): { success: boolean; error?: string } => {
    if (!checkPermission('users_permissions', 'edit') && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Acesso negado: sem permissão para alterar status de usuários.' };
    }

    const currentList = usersMap[currentCompanyId] || [];
    const targetUser = currentList.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    if (targetUser.id === currentUser.id) {
      return { success: false, error: 'Operação bloqueada: Não é permitido desativar a própria conta de sessão.' };
    }

    if (targetUser.isActive && (targetUser.baseProfile === 'admin' || targetUser.role === 'owner')) {
      const activeAdmins = currentList.filter(
        u => u.id !== userId && u.isActive && (u.baseProfile === 'admin' || u.role === 'owner')
      );
      if (activeAdmins.length === 0) {
        return { success: false, error: 'Operação bloqueada: Não é possível desativar o único Administrador ativo.' };
      }
    }

    const nextStatus = !targetUser.isActive;
    setUsersMap(prev => {
      const list = prev[currentCompanyId] || [];
      const updated = list.map(u => (u.id === userId ? { ...u, isActive: nextStatus, updatedAt: new Date().toISOString() } : u));
      return { ...prev, [currentCompanyId]: updated };
    });

    addAuditLog(
      targetUser,
      nextStatus ? 'user_activated' : 'user_deactivated',
      `Usuário ${targetUser.name} foi ${nextStatus ? 'reativado' : 'bloqueado/desativado'}.`
    );
    return { success: true };
  };

  const terminateUserSession = (userId: string): { success: boolean; error?: string } => {
    if (!checkPermission('users_permissions', 'edit') && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Acesso negado: sem permissão para encerrar sessões.' };
    }

    const currentList = usersMap[currentCompanyId] || [];
    const targetUser = currentList.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    setUsersMap(prev => {
      const list = prev[currentCompanyId] || [];
      const updated = list.map(u =>
        u.id === userId ? { ...u, sessionTerminatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : u
      );
      return { ...prev, [currentCompanyId]: updated };
    });

    addAuditLog(targetUser, 'session_terminated', `Sessão ativa de ${targetUser.name} foi encerrada administrativamente.`);
    return { success: true };
  };

  const switchUser = (userId: string) => {
    const target = companyUsers.find(u => u.id === userId);
    if (target) {
      setCurrentUserId(userId);
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenantId: currentCompanyId,
        currentCompany,
        currentUser,
        companyUsers,
        auditLogs,
        availableCompanies: companies,
        updateCompanySettings,
        updateWhatsAppConfig,
        testWhatsAppConnection,
        disconnectWhatsApp,
        updateUserProfile,
        createUser,
        updateUser,
        updateUserPermissions,
        toggleUserActiveStatus,
        terminateUserSession,
        checkPermission,
        switchUser,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
};
