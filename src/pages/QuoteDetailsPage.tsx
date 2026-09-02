/**
 * @file QuoteDetailsPage.tsx
 * @description Página Completa de Detalhes do Orçamento Gráfico
 * @route /quotes/:quoteId
 * @project OrçaGraf
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  MessageSquare,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  User,
  Building,
  Calendar,
  Layers,
  Scissors,
  Sparkles,
  Send,
  X,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCommercial } from '../context/CommercialContext';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationContext';
import { getEnvironmentCapabilities } from '../domain/environment-capabilities';
import { hasUserPermission } from '../types/tenant';
import { QUOTE_STATUS_METADATA } from '../domain/quote-status';
import { formatCentsToBRL, normalizeMonetaryText } from '../domain/money';
import { formatItemPricingDescription } from '../domain/pricing-engine';
import { PdfExportService } from '../services/pdf-export.service';
import { WhatsAppIntegrationService } from '../services/whatsapp-integration.service';
import { Quote } from '../types/quote';

interface QuoteDetailsPageProps {
  quoteId: string;
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

export const QuoteDetailsPage: React.FC<QuoteDetailsPageProps> = ({ quoteId, onBack, onNavigate }) => {
  const { quotes, approveQuote, rejectQuote, downloadQuotePdf, sendQuoteViaWhatsApp } = useCommercial();
  const { currentCompany, currentUser } = useTenant();
  const { showNotice } = useNotification();
  const capabilities = getEnvironmentCapabilities();

  // WhatsApp Dialog Modal
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [wpRecipientPhone, setWpRecipientPhone] = useState('');
  const [wpCustomMessage, setWpCustomMessage] = useState('');
  const [isSendingWp, setIsSendingWp] = useState(false);

  // Approval Confirmation Modal State
  const [isConfirmApproveModalOpen, setIsConfirmApproveModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Permissão de aprovação
  const canApprove = useMemo(() => {
    if (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager') {
      return true;
    }
    return hasUserPermission(currentUser, 'quotes', 'approve');
  }, [currentUser]);

  // Busca o orçamento pelo ID com isolamento do tenant atual
  const quote = useMemo(() => {
    return quotes.find(q => q.id === quoteId && q.tenantId === currentCompany.id);
  }, [quotes, quoteId, currentCompany.id]);

  // Trigger Ref para retorno de foco
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleCloseConfirmApproveModal = () => {
    if (isApproving) return;
    setIsConfirmApproveModalOpen(false);
    triggerRef.current?.focus();
  };

  const handleCloseWpModal = () => {
    setIsWpModalOpen(false);
    triggerRef.current?.focus();
  };

  // Listener de tecla Escape
  React.useEffect(() => {
    const isAnyModalOpen = isConfirmApproveModalOpen || isWpModalOpen;
    if (!isAnyModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isConfirmApproveModalOpen && !isApproving) {
          handleCloseConfirmApproveModal();
        } else if (isWpModalOpen) {
          handleCloseWpModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfirmApproveModalOpen, isWpModalOpen, isApproving]);

  if (!quote) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12">
        <Card className="p-8 text-center bg-white border-slate-200 shadow-xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Orçamento não encontrado</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            O orçamento solicitado (ID: <code className="font-mono font-bold text-slate-700">{quoteId}</code>) não existe ou pertence a outra empresa gráfica.
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
              Voltar para Lista de Orçamentos
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const meta = QUOTE_STATUS_METADATA[quote.status];
  const discountCents = quote.discount?.appliedAmountCents || quote.discountCents || 0;

  const handleOpenWhatsApp = () => {
    if (!capabilities.canUseWhatsApp) {
      showNotice(
        'WhatsApp Não Configurado',
        'A integração oficial com o WhatsApp Business ainda não está configurada. Utilize o botão "Baixar PDF" para obter o arquivo oficial da proposta.',
        'info'
      );
      return;
    }
    triggerRef.current = document.activeElement as HTMLElement;
    setWpRecipientPhone(quote.customerContact || '');
    const defaultMsg = `Olá, ${quote.customerName}! Segue a proposta comercial ${quote.quoteNumber} elaborada pela ${currentCompany.tradeName}.`;
    setWpCustomMessage(defaultMsg);
    setIsWpModalOpen(true);
  };

  const handleConfirmSendWhatsApp = () => {
    setIsSendingWp(true);
    try {
      const result = sendQuoteViaWhatsApp(quote.id, wpCustomMessage, wpRecipientPhone);
      if (result.success && result.messageUrl) {
        window.open(result.messageUrl, '_blank', 'noopener,noreferrer');
        handleCloseWpModal();
      }
    } finally {
      setIsSendingWp(false);
    }
  };

  const handleOpenApproveModal = () => {
    if (!canApprove) {
      showNotice('Acesso Negado', 'Seu perfil de usuário não possui permissão para aprovar orçamentos.', 'error');
      return;
    }
    triggerRef.current = document.activeElement as HTMLElement;
    setIsConfirmApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (isApproving) return;
    if (!canApprove) {
      showNotice('Operação Bloqueada', 'Usuário sem permissão comercial para aprovar orçamentos.', 'error');
      return;
    }
    setIsApproving(true);
    try {
      approveQuote(quote.id);
      setIsConfirmApproveModalOpen(false);
      triggerRef.current?.focus();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Breadcrumb, Título e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            aria-label="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-black text-2xl text-slate-900">{quote.quoteNumber}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${
                  quote.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : quote.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {quote.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {quote.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                {quote.status === 'awaiting_customer' && <Clock className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{meta.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Criado em {new Date(quote.createdAt).toLocaleDateString('pt-BR')} • {quote.customerName}
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Aprovação Principal para Orçamentos Aguardando Cliente */}
          {quote.status === 'awaiting_customer' && canApprove && (
            <button
              type="button"
              onClick={handleOpenApproveModal}
              disabled={isApproving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-700 active:scale-98"
            >
              <span>✓ Aprovar orçamento</span>
            </button>
          )}

          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4 text-emerald-600" />}
            onClick={() => downloadQuotePdf(quote.id)}
          >
            Baixar PDF
          </Button>

          <Button
            variant="secondary"
            className="text-emerald-700 hover:bg-emerald-50"
            icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
            onClick={handleOpenWhatsApp}
          >
            Enviar pelo WhatsApp
          </Button>

          {quote.status === 'awaiting_customer' && (
            <Button
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50"
              icon={<XCircle className="w-4 h-4" />}
              onClick={() => {
                rejectQuote(quote.id, 'Recusado pelo cliente');
              }}
            >
              Recusar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal (2/3): Itens do Orçamento e Condições Financeiras */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card dos Itens */}
          <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Itens da Proposta ({quote.items.length})
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {quote.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 font-mono">#{idx + 1}</span>
                        <h3 className="text-sm font-bold text-slate-900">{item.productName}</h3>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.materialName && <span className="font-semibold text-slate-700">Material: {item.materialName}</span>}
                        {item.widthMm && item.heightMm && (
                          <span className="ml-2 font-mono">
                            • {item.widthMm} x {item.heightMm} mm {item.areaM2 ? `(${item.areaM2.toFixed(3)} m²)` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-500">
                        {item.pricingSummary || formatItemPricingDescription(item)}
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {formatCentsToBRL(item.totalPriceCents)}
                      </div>
                    </div>
                  </div>

                  {/* Acabamentos Vinculados e Adicionais */}
                  {item.finishings && item.finishings.length > 0 && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200/90 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <Scissors className="w-3 h-3 text-emerald-600" />
                        <span>Acabamentos Técnicos do Item</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.finishings.map((fin, fIdx) => {
                          const isFree = fin.priceStatus === 'FREE' || (!fin.totalPriceCents && fin.isRequired);
                          return (
                            <span
                              key={fin.finishingId || fIdx}
                              className={`px-2.5 py-1 rounded-xl font-medium text-[11px] border flex items-center gap-1.5 ${
                                fin.isRequired
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isFree
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <span>{fin.name}</span>
                              {fin.isRequired ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                                  Incluso
                                </span>
                              ) : isFree ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  Incluso
                                </span>
                              ) : (
                                <span className="font-mono text-emerald-900 font-bold">
                                  (+{formatCentsToBRL(fin.totalPriceCents)})
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      {item.finishings.some(f => f.calculationMemory && f.totalPriceCents > 0) && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                          {item.finishings
                            .filter(f => f.calculationMemory && f.totalPriceCents > 0)
                            .map((f, fIdx) => (
                              <div key={f.finishingId || fIdx} className="text-[10px] text-slate-500 font-mono flex justify-between">
                                <span>• {f.name}: {f.calculationMemory}</span>
                                <span className="font-bold text-slate-700">{formatCentsToBRL(f.totalPriceCents)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                      Observação: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Resumo Financeiro & Totais */}
          <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Fechamento Financeiro</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal dos Itens:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatCentsToBRL(quote.subtotalCents)}
                </span>
              </div>

              {discountCents > 0 && (
                <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <div>
                    <span className="font-bold">Desconto Comercial Aplicado:</span>
                    {quote.discount?.reason && (
                      <div className="text-[10px] text-emerald-600">{quote.discount.reason}</div>
                    )}
                  </div>
                  <span className="font-mono font-bold text-sm">
                    - {formatCentsToBRL(discountCents)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-base font-extrabold text-slate-900 block">Total Final da Proposta:</span>
                  <span className="text-xs text-slate-500 font-medium">Condição: {quote.paymentTerms || 'À vista'}</span>
                </div>
                <span className="font-mono font-black text-2xl text-emerald-600">
                  {formatCentsToBRL(quote.totalCents)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna Lateral (1/3): Cliente, Vendedor e Histórico */}
        <div className="space-y-6">
          {/* Dados do Atendimento & Vendedor */}
          <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800">
              <User className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Atendimento & Cliente</h2>
            </div>

            {/* Vendedor Responsável */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Vendedor Responsável
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {quote.sellerName || quote.salespersonName || 'Vendas Geral'}
              </div>
              <div className="text-[11px] text-slate-500">
                Atendimento Comercial • {currentCompany.tradeName}
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Cliente</span>
                <span className="font-bold text-slate-900 text-sm">{quote.customerName}</span>
              </div>
              {quote.customerDocument && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">CPF / CNPJ</span>
                  <span className="text-slate-700 font-mono">{quote.customerDocument}</span>
                </div>
              )}
              {quote.customerContact && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Contato / WhatsApp</span>
                  <span className="text-slate-700 font-mono">{quote.customerContact}</span>
                </div>
              )}
              {quote.customerEmail && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">E-mail</span>
                  <span className="text-slate-700">{quote.customerEmail}</span>
                </div>
              )}
            </div>

            {/* Prazos */}
            <div className="pt-3 border-t border-slate-100 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Prazo de Produção</span>
              <span className="font-bold text-slate-800">
                {quote.estimatedProductionDays || currentCompany.customization.defaultProductionDays || 3} dias úteis
              </span>
            </div>

            {/* ArteFlow Sync Status (Apenas quando integração do ecossistema estiver ativa) */}
            {capabilities.canUseArteFlow && quote.arteflowSync?.status === 'synced' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sincronizado no ArteFlow</span>
                </div>
                <div className="text-[11px] font-mono">
                  Ordem de Produção: #{quote.arteflowSync.arteflowOrderId}
                </div>
              </div>
            )}
          </Card>

          {/* Histórico / Timeline */}
          <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Histórico de Eventos</h2>
            </div>

            <div className="space-y-2">
              {quote.events && quote.events.length > 0 ? (
                quote.events.map(ev => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{ev.userName || 'Sistema'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(ev.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{normalizeMonetaryText(ev.description)}</p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-2 text-center">
                  Orçamento criado em {new Date(quote.createdAt).toLocaleDateString('pt-BR')}.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Confirmação de Aprovação */}
      {isConfirmApproveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isApproving) handleCloseConfirmApproveModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 bg-emerald-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirmar Aprovação do Orçamento</span>
              </div>
              <button
                type="button"
                onClick={handleCloseConfirmApproveModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                disabled={isApproving}
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Número:</span>
                  <span className="font-mono font-bold text-slate-900">{quote.quoteNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{quote.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 pt-1.5 border-t border-slate-200">
                  <span>Valor Total:</span>
                  <span className="font-mono font-black text-sm text-emerald-600">
                    {formatCentsToBRL(quote.totalCents)}
                  </span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Aprovar este orçamento? Após a aprovação, o orçamento será registrado como aprovado comercialmente no OrçaGraf.
              </p>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCloseConfirmApproveModal}
                disabled={isApproving}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold"
                onClick={handleConfirmApprove}
                disabled={isApproving}
              >
                {isApproving ? 'Processando...' : 'Confirmar aprovação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Disparo por WhatsApp */}
      {isWpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseWpModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Enviar Orçamento via WhatsApp</span>
              </div>
              <button
                onClick={handleCloseWpModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp do Destinatário
                </label>
                <input
                  type="text"
                  value={wpRecipientPhone}
                  onChange={e => setWpRecipientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mensagem de Envio
                </label>
                <textarea
                  rows={4}
                  value={wpCustomMessage}
                  onChange={e => setWpCustomMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-900 font-mono text-[11px]">
                    {PdfExportService.getQuotePdfFilename(quote)}
                  </span>
                </div>
                <Badge variant="success" size="sm">Relatório PDF</Badge>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsWpModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={handleConfirmSendWhatsApp}
                disabled={isSendingWp || !wpRecipientPhone}
              >
                Abrir WhatsApp e Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
