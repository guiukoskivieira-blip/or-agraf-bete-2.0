/**
 * @file MyProfilePage.tsx
 * @description Página de Gerenciamento do Meu Perfil, Foto e Preferências
 * @route /profile
 * @project OrçaGraf
 */

import React, { useState, useRef } from 'react';
import { Camera, Trash2, Save, User as UserIcon, Lock, LogOut } from 'lucide-react';
import { SettingsLayout, SettingsTab } from '../../components/layout/SettingsLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

interface MyProfilePageProps {
  onNavigateSettings: (tab: SettingsTab) => void;
}

export const MyProfilePage: React.FC<MyProfilePageProps> = ({ onNavigateSettings }) => {
  const { currentUser, currentCompany, updateUserProfile } = useTenant();
  const { showNotice } = useNotification();
  const { isModeConnected, signOut } = useAuth();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentUser.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotice('Arquivo Muito Grande', 'A imagem deve ter no máximo 2MB.', 'warning');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showNotice('Formato Inválido', 'Selecione um arquivo de imagem válido (PNG, JPG, WEBP).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showNotice('Campos Obrigatórios', 'Nome e e-mail não podem ficar vazios.', 'warning');
      return;
    }

    updateUserProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatarUrl: avatarPreview,
    });

    showNotice('Perfil Salvo', 'Seus dados e foto foram atualizados com sucesso.', 'success');
  };

  return (
    <SettingsLayout
      activeTab="profile"
      onNavigate={onNavigateSettings}
      title="Meu Perfil"
      description="Gerencie seus dados de acesso, foto de perfil e informações pessoais no OrçaGraf."
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-800">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Identificação do Usuário</h2>
            </div>
            {currentUser.dataOrigin === 'demo' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Usuário demonstrativo
              </span>
            )}
          </div>

          {/* Foto de Perfil */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="relative group shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={currentUser.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Foto de Perfil</h3>
              <p className="text-xs text-slate-500">
                Sua foto é exibida na barra lateral, no cabeçalho e na seleção de vendedor responsável nos orçamentos.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Camera className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Alterar Foto
                </Button>

                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={handleRemoveAvatar}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Campos de Dados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome Completo *"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
            <Input
              label="E-mail de Acesso *"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
              required
            />
          </div>

          {/* Dados de Perfil & Empresa (Read-only) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Perfil de Acesso
              </label>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 capitalize flex items-center justify-between">
                <span>{currentUser.role}</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Gráfica / Empresa
              </label>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{currentCompany.tradeName}</span>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {isModeConnected ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                icon={<LogOut className="w-3.5 h-3.5" />}
                onClick={() => signOut()}
              >
                Sair da Conta
              </Button>
            ) : <div />}

            <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
              Salvar Alterações
            </Button>
          </div>
        </Card>
      </form>
    </SettingsLayout>
  );
};
