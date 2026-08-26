/**
 * @file IntegrationsPage.tsx
 * @description Página de Integrações Oficiais e Estado do Ecossistema no OrçaGraf
 * @route /profile/integrations
 * @project OrçaGraf
 */

import React from 'react';
import {
  MessageSquare,
  Sparkles,
  Info,
  ExternalLink,
  ShieldAlert,
  Layers,
  FileCheck,
} from 'lucide-react';
import { SettingsLayout, SettingsTab } from '../../components/layout/SettingsLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useTenant } from '../../context/TenantContext';
import { getEnvironmentCapabilities } from '../../domain/environment-capabilities';

interface IntegrationsPageProps {
  onNavigateSettings: (tab: SettingsTab) => void;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ onNavigateSettings }) => {
  const { currentCompany } = useTenant();
  const capabilities = getEnvironmentCapabilities();

  return (
    <SettingsLayout
      activeTab="integrations"
      onNavigate={onNavigateSettings}
      title="Integrações"
      description="Gerenciamento de conexões e módulos do ecossistema comercial e gráfico."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Aviso de Ambiente Standalone */}
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-3.5">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-sky-900">
            <span className="font-bold text-sm block">
              Ambiente Standalone ({currentCompany.tradeName})
            </span>
            <p className="text-sky-800 leading-relaxed">
              O OrçaGraf opera de forma independente para formação de preço, cadastro de clientes, elaboração de orçamentos e download de relatórios comerciais em PDF. Integrações externas e sincronização em nuvem serão gerenciadas futuramente pela plataforma Prexyon.
            </p>
          </div>
        </div>

        {/* Card 1: WhatsApp Business Cloud API */}
        <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">WhatsApp Business Cloud API</h2>
                  <Badge variant="neutral">
                    {capabilities.canUseWhatsApp ? 'Conectado' : 'Não configurado'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comunicação oficial Meta Graph API para envio automatizado de propostas.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">
              A integração oficial com o WhatsApp Business ainda não está configurada neste ambiente.
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No momento, utilize o botão de <strong>Download em PDF</strong> nos orçamentos para gerar o arquivo vetorial A4 oficial e compartilhá-lo pelos canais habituais da sua gráfica.
            </p>
          </div>
        </Card>

        {/* Card 2: Ecossistema Prexyon (ArteCheck e ArteFlow) */}
        <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Ecossistema Prexyon</h2>
                <Badge variant="info">Disponível Futuramente</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Módulos complementares para o fluxo de pré-impressão e produção industrial gráfica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* ArteCheck */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-xs text-slate-900">ArteCheck</span>
                </div>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Pré-impressão
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Inspeção técnica automatizada de PDFs, conferência de sangria, perfil de cores (CMYK) e resolução de imagens.
              </p>
              <div className="pt-2 text-[10px] text-slate-400 font-medium">
                Integração futura pelo ecossistema Prexyon.
              </div>
            </div>

            {/* ArteFlow */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs text-slate-900">ArteFlow</span>
                </div>
                <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Produção & PCP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gestão da esteira de produção gráfica, ordens de serviço (OS), roteiro de máquinas, PCP e financeiro avançado.
              </p>
              <div className="pt-2 text-[10px] text-slate-400 font-medium">
                Integração futura pelo ecossistema Prexyon.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </SettingsLayout>
  );
};
