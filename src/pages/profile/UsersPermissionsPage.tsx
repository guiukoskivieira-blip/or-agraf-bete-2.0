/**
 * @file UsersPermissionsPage.tsx
 * @description Gestão de Usuários, Vendedores e Matriz Granular de Permissões
 * @route /profile/users
 * @project OrçaGraf
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Shield,
  PlusCircle,
  Search,
  CheckCircle2,
  KeyRound,
  History,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { SettingsLayout, SettingsTab } from '../../components/layout/SettingsLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import {
  User,
  BaseProfile,
  UserPermissions,
  MODULE_DEFINITIONS,
  ACTION_DEFINITIONS,
  getDefaultPermissionsForProfile,
  PermissionModule,
  PermissionAction,
} from '../../types/tenant';

interface UsersPermissionsPageProps {
  onNavigateSettings: (tab: SettingsTab) => void;
}

export const UsersPermissionsPage: React.FC<UsersPermissionsPageProps> = ({ onNavigateSettings }) => {
  const {
    currentUser,
    companyUsers,
    currentCompany,
    auditLogs,
    createUser,
    updateUser,
    updateUserPermissions,
    toggleUserActiveStatus,
    checkPermission,
  } = useTenant();
  const { showNotice } = useNotification();

  const isAdministrator = currentUser.role === 'owner' || currentUser.role === 'admin' || checkPermission('users_permissions', 'edit');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Formulário de Criação/Edição
  const [formUserData, setFormUserData] = useState<{
    name: string;
    email: string;
    baseProfile: BaseProfile;
    permissions: UserPermissions;
  }>({
    name: '',
    email: '',
    baseProfile: 'sales',
    permissions: getDefaultPermissionsForProfile('sales'),
  });

  const tenantUsers = useMemo(() => {
    return companyUsers.filter(u => u.tenantId === currentCompany.id);
  }, [companyUsers, currentCompany.id]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return tenantUsers;
    const term = searchTerm.toLowerCase();
    return tenantUsers.filter(
      u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.baseProfile && u.baseProfile.toLowerCase().includes(term))
    );
  }, [tenantUsers, searchTerm]);

  const handleStartCreateUser = () => {
    if (!isAdministrator) {
      showNotice('Acesso Negado', 'Seu perfil não possui permissão para cadastrar novos usuários.', 'error');
      return;
    }
    setFormUserData({
      name: '',
      email: '',
      baseProfile: 'sales',
      permissions: getDefaultPermissionsForProfile('sales'),
    });
    setSelectedUserForEdit(null);
    setIsCreatingUser(true);
  };

  const handleStartEditUser = (user: User) => {
    if (!isAdministrator) {
      showNotice('Acesso Negado', 'Seu perfil não possui permissão para editar usuários ou permissões.', 'error');
      return;
    }
    setSelectedUserForEdit(user);
    setFormUserData({
      name: user.name,
      email: user.email,
      baseProfile: user.baseProfile || 'sales',
      permissions: JSON.parse(JSON.stringify(user.permissions || getDefaultPermissionsForProfile(user.baseProfile || 'sales'))),
    });
    setIsCreatingUser(false);
  };

  const handleProfileChange = (profile: BaseProfile) => {
    setFormUserData(prev => ({
      ...prev,
      baseProfile: profile,
      permissions: getDefaultPermissionsForProfile(profile),
    }));
  };

  const handleTogglePermission = (module: PermissionModule, action: PermissionAction) => {
    setFormUserData(prev => {
      const currentList: PermissionAction[] = prev.permissions[module] || [];
      const hasAction = currentList.includes(action);
      const newList = hasAction
        ? currentList.filter(a => a !== action)
        : [...currentList, action];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: newList,
        },
      };
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserData.name.trim() || !formUserData.email.trim()) {
      showNotice('Campos Obrigatórios', 'Nome e e-mail são obrigatórios.', 'warning');
      return;
    }

    if (isCreatingUser) {
      createUser({
        name: formUserData.name.trim(),
        email: formUserData.email.trim().toLowerCase(),
        baseProfile: formUserData.baseProfile,
        permissions: formUserData.permissions,
      });
      setIsCreatingUser(false);
      showNotice('Usuário Criado', 'Novo usuário adicionado com sucesso.', 'success');
    } else if (selectedUserForEdit) {
      updateUser(selectedUserForEdit.id, {
        name: formUserData.name.trim(),
        email: formUserData.email.trim().toLowerCase(),
        baseProfile: formUserData.baseProfile,
      });
      updateUserPermissions(selectedUserForEdit.id, formUserData.permissions);
      setSelectedUserForEdit(null);
      showNotice('Usuário Atualizado', 'As permissões foram salvas.', 'success');
    }
  };

  const moduleEntries = Object.entries(MODULE_DEFINITIONS) as [
    PermissionModule,
    { label: string; description: string; availableActions: PermissionAction[] }
  ][];

  return (
    <SettingsLayout
      activeTab="users"
      onNavigate={onNavigateSettings}
      title="Usuários e Permissões"
      description="Gerencie os colaboradores da gráfica, perfis de acesso e a matriz de permissões de cada módulo."
    >
      <div className="space-y-6">
        {/* Banner Informativo sobre Usuários Demonstrativos */}
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between gap-3">
          <p>
            <strong className="font-bold">Aviso do Ambiente:</strong> Os usuários exibidos são dados demonstrativos locais. Contas reais serão gerenciadas futuramente pela Prexyon.
          </p>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
            Ambiente Local
          </span>
        </div>

        {/* Barra Superior com Pesquisa e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou perfil..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<History className="w-3.5 h-3.5" />}
              onClick={() => setShowAuditLogs(prev => !prev)}
            >
              {showAuditLogs ? 'Ver Usuários' : 'Trilha de Auditoria'}
            </Button>

            {isAdministrator && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                onClick={handleStartCreateUser}
              >
                Novo Usuário
              </Button>
            )}
          </div>
        </div>

        {/* Auditoria ou Lista de Usuários */}
        {showAuditLogs ? (
          <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Trilha de Auditoria de Acessos e Alterações
            </h2>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {auditLogs.map(log => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{log.performedByUserName}</span>
                    <span className="text-slate-600 ml-1.5">{log.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 e 2: Tabela de Usuários */}
            <div className={selectedUserForEdit || isCreatingUser ? 'lg:col-span-1' : 'lg:col-span-3'}>
              <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Usuários Ativos e Inativos ({filteredUsers.length})
                    </h3>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredUsers.map(user => {
                    const isSelf = user.id === currentUser.id;
                    const isSelected = selectedUserForEdit?.id === user.id;

                    return (
                      <div
                        key={user.id}
                        className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">{user.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">
                                  Você
                                </span>
                              )}
                              <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
                                {user.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {user.email} • <span className="capitalize">{user.baseProfile || user.role}</span>
                            </div>
                          </div>
                        </div>

                        {isAdministrator && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon={<KeyRound className="w-3.5 h-3.5" />}
                              onClick={() => handleStartEditUser(user)}
                            >
                              Permissões
                            </Button>
                            {!isSelf && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={user.isActive ? 'text-amber-600' : 'text-emerald-600'}
                                onClick={() => toggleUserActiveStatus(user.id)}
                              >
                                {user.isActive ? 'Desativar' : 'Ativar'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Coluna 3: Formulário de Permissões Granulares */}
            {(selectedUserForEdit || isCreatingUser) && (
              <div className="lg:col-span-2 space-y-4 animate-in fade-in duration-200">
                <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        {isCreatingUser ? 'Novo Usuário do Sistema' : `Editar Permissões: ${selectedUserForEdit?.name}`}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUserForEdit(null);
                        setIsCreatingUser(false);
                      }}
                    >
                      Fechar
                    </Button>
                  </div>

                  <form onSubmit={handleSaveUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Nome Completo *"
                        value={formUserData.name}
                        onChange={e => setFormUserData({ ...formUserData, name: e.target.value })}
                        required
                      />
                      <Input
                        label="E-mail de Login *"
                        type="email"
                        value={formUserData.email}
                        onChange={e => setFormUserData({ ...formUserData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Perfil Base Pré-Configurado
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['sales', 'reception', 'production', 'admin'] as BaseProfile[]).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleProfileChange(p)}
                            className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                              formUserData.baseProfile === p
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {p === 'sales' ? 'Vendas' : p === 'reception' ? 'Recepção' : p === 'production' ? 'Produção' : 'Admin'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Matriz Granular de Permissões */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Matriz Detalhada de Permissões por Módulo
                      </label>

                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                        {moduleEntries.map(([modKey, modDef]) => (
                          <div key={modKey} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900">{modDef.label}</div>
                              <div className="text-[10px] text-slate-400">{modDef.description}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {modDef.availableActions.map(actionKey => {
                                const actionDef = ACTION_DEFINITIONS[actionKey];
                                const isChecked = (formUserData.permissions[modKey] || []).includes(actionKey);

                                return (
                                  <label key={actionKey} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleTogglePermission(modKey, actionKey)}
                                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                    />
                                    <span>{actionDef?.label || actionKey}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSelectedUserForEdit(null);
                          setIsCreatingUser(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary">
                        Salvar Usuário
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </SettingsLayout>
  );
};
