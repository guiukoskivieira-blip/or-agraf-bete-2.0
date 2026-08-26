/**
 * @file IntegrationsPage.tsx
 * @description Página de Integrações Oficiais (WhatsApp Business Cloud API e ArteFlow)
 * @route /profile/integrations
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  Edit,
  Save,
  Sliders,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { SettingsLayout, SettingsTab } from '../../components/layout/SettingsLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { WhatsAppIntegration } from '../../types/tenant';

interface IntegrationsPageProps {
  onNavigateSettings: (tab: SettingsTab) => void;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ onNavigateSettings }) => {
  const {
    currentCompany,
    updateWhatsAppConfig,
    testWhatsAppConnection,
    disconnectWhatsApp,
  } = useTenant();
  const { showNotice } = useNotification();

  const currentWp = currentCompany.whatsappConfig || {
    status: 'not_configured',
    preferences: {
      allowQuotePdfReport: true,
      attachPdf: true,
      notifyOnApproved: true,
      notifyArteFlowUpdates: true,
      sendMode: 'with_confirmation',
    },
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Formulário de Credenciais da API Cloud
  const [phoneNumber, setPhoneNumber] = useState(currentWp.phoneNumber || '');
  const [accountName, setAccountName] = useState(currentWp.accountName || '');
  const [phoneNumberId, setPhoneNumberId] = useState(currentWp.phoneNumberId || '');
  const [businessAccountId, setBusinessAccountId] = useState(currentWp.businessAccountId || '');
  const [apiVersion, setApiVersion] = useState(currentWp.apiVersion || 'v21.0');

  // Opções e Toggles da Integração
  const [allowPdfReport, setAllowPdfReport] = useState<boolean>(
    currentWp.preferences?.allowQuotePdfReport ?? currentWp.preferences?.attachPdf ?? true
  );
  const [notifyArteFlow, setNotifyArteFlow] = useState<boolean>(
    currentWp.preferences?.notifyArteFlowUpdates ?? true
  );
  const [notifyOnApproved, setNotifyOnApproved] = useState<boolean>(
    currentWp.preferences?.notifyOnApproved ?? true
  );

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testWhatsAppConnection();
      if (result.success) {
        showNotice('Conexão Bem-Sucedida', result.message, 'success');
      } else {
        showNotice('Erro de Conexão', result.message, 'error');
      }
    } catch {
      showNotice('Erro de Conexão', 'Não foi possível conectar com o servidor Meta.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showNotice('Campo Obrigatório', 'Informe o número do WhatsApp comercial.', 'warning');
      return;
    }

    const payload: WhatsAppIntegration = {
      status: 'connected',
      phoneNumber: phoneNumber.trim(),
      accountName: accountName.trim() || 'WhatsApp Oficial da Gráfica',
      phoneNumberId: phoneNumberId.trim() || 'phone_id_default',
      businessAccountId: businessAccountId.trim() || 'waba_id_default',
      apiVersion: apiVersion.trim() || 'v21.0',
      lastSyncAt: new Date().toISOString(),
      preferences: {
        allowQuotePdfReport: allowPdfReport,
        attachPdf: allowPdfReport,
        notifyOnApproved,
        notifyArteFlowUpdates: notifyArteFlow,
        sendMode: 'with_confirmation',
      },
    };

    updateWhatsAppConfig(payload);
    setIsEditing(false);
    showNotice('Configuração Salva', 'Integração do WhatsApp atualizada com sucesso.', 'success');
  };

  const handleDisconnect = () => {
    disconnectWhatsApp();
    setPhoneNumber('');
    setAccountName('');
    setIsEditing(false);
    showNotice('Desconectado', 'A integração com o WhatsApp foi desativada.', 'info');
  };

  const isConnected = currentWp.status === 'connected';

  return (
    <SettingsLayout
      activeTab="integrations"
      onNavigate={onNavigateSettings}
      title="Integrações"
      description="Configure a comunicação oficial via WhatsApp Business Cloud API e o compartilhamento com o ArteFlow."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Card Principal: Status da Conexão e Ações */}
        <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">WhatsApp Business Cloud API</h2>
                  <Badge variant={isConnected ? 'success' : 'neutral'}>
                    {isConnected ? 'Conectado' : 'Não Configurado'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comunicação oficial Meta Graph API para envio de relatórios e orçamentos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />}
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    Testar Conexão
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Edit className="w-3.5 h-3.5" />}
                    onClick={() => setIsEditing(prev => !prev)}
                  >
                    {isEditing ? 'Fechar Edição' : 'Editar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    icon={<Power className="w-3.5 h-3.5" />}
                    onClick={handleDisconnect}
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 border-teal-600"
                  icon={<Sliders className="w-3.5 h-3.5" />}
                  onClick={() => setIsEditing(true)}
                >
                  Configurar WhatsApp
                </Button>
              )}
            </div>
          </div>

          {/* Dados do Número Conectado */}
          {isConnected && !isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-teal-50/40 border border-teal-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                  Número Conectado
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {currentWp.phoneNumber || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                  Conta Comercial
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {currentWp.accountName || currentCompany.tradeName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                  Última Sincronização
                </span>
                <span className="text-xs text-slate-600">
                  {currentWp.lastSyncAt ? new Date(currentWp.lastSyncAt).toLocaleString('pt-BR') : 'Hoje'}
                </span>
              </div>
            </div>
          )}

          {/* Formulário de Configuração / Edição */}
          {isEditing && (
            <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Número de WhatsApp Comercial *"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                  required
                />
                <Input
                  label="Nome da Conta Comercial"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Nome exibido no perfil Meta"
                />
                <Input
                  label="Phone Number ID (Meta Graph)"
                  value={phoneNumberId}
                  onChange={e => setPhoneNumberId(e.target.value)}
                  placeholder="Ex: 104829384729182"
                />
                <Input
                  label="WABA ID (WhatsApp Business Account ID)"
                  value={businessAccountId}
                  onChange={e => setBusinessAccountId(e.target.value)}
                  placeholder="Ex: 294819284719284"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                  Salvar Credenciais
                </Button>
              </div>
            </form>
          )}

          {/* Opções e Regras da Integração */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Preferências e Recursos
            </h3>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {/* Opção 1: Envio do Relatório do Orçamento em PDF */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Permitir envio do relatório do orçamento em PDF
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Gera e anexa automaticamente o documento PDF com visual formal ao disparar o orçamento pelo WhatsApp.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowPdfReport}
                  onChange={e => {
                    setAllowPdfReport(e.target.checked);
                    updateWhatsAppConfig({
                      preferences: {
                        ...currentWp.preferences,
                        allowQuotePdfReport: e.target.checked,
                        attachPdf: e.target.checked,
                      },
                    });
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Opção 2: Compartilhamento com o ArteFlow */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Compartilhar integração com o ArteFlow
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Permite que o módulo de produção envie atualizações e avisos de status de ordens de serviço pelo mesmo canal.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyArteFlow}
                  onChange={e => {
                    setNotifyArteFlow(e.target.checked);
                    updateWhatsAppConfig({
                      preferences: {
                        ...currentWp.preferences,
                        notifyArteFlowUpdates: e.target.checked,
                      },
                    });
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Informações Técnicas da API Cloud */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Informações Técnicas (WhatsApp Cloud API)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 font-mono">
              <div>API Version: <span className="font-bold text-slate-800">{apiVersion}</span></div>
              <div>Endpoint: <span className="font-bold text-slate-800">graph.facebook.com</span></div>
              <div>Webhooks: <span className="font-bold text-slate-800">/api/webhooks/whatsapp</span></div>
            </div>
          </div>
        </Card>
      </div>
    </SettingsLayout>
  );
};
