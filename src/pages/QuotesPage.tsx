/**
 * @file QuotesPage.tsx
 * @description Listagem e Gestão Comercial dos Orçamentos (Design System Light)
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  MessageSquare,
  Clock,
  Send,
  X,
} from 'lucide-react';
import { SearchBar } from '../components/common/SearchBar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Quote, QuoteStatus } from '../types/quote';
import { useCommercial } from '../context/CommercialContext';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationContext';
import { getEnvironmentCapabilities } from '../domain/environment-capabilities';
import { QUOTE_STATUS_METADATA } from '../domain/quote-status';
import { formatCentsToBRL } from '../domain/money';
import { PdfExportService } from '../services/pdf-export.service';

interface QuotesPageProps {
  onNewQuote: () => void;
  onViewQuote?: (quoteId: string) => void;
}

export const QuotesPage: React.FC<QuotesPageProps> = ({ onNewQuote, onViewQuote }) => {
  const { quotes, downloadQuotePdf, sendQuoteViaWhatsApp } = useCommercial();
  const { currentCompany } = useTenant();
  const { showNotice } = useNotification();
  const capabilities = getEnvironmentCapabilities();

  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // WhatsApp Dialog Modal State
  const [quoteForWhatsApp, setQuoteForWhatsApp] = useState<Quote | null>(null);
  const [wpRecipientPhone, setWpRecipientPhone] = useState('');
  const [wpCustomMessage, setWpCustomMessage] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Trigger Ref para retorno de foco
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleCloseWhatsAppModal = () => {
    setQuoteForWhatsApp(null);
    triggerRef.current?.focus();
  };

  React.useEffect(() => {
    if (!quoteForWhatsApp) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleCloseWhatsAppModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quoteForWhatsApp]);

  // Contadores dinâmicos
  const counts = {
    all: quotes.length,
    awaiting_customer: quotes.filter(q => q.status === 'awaiting_customer').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
  };

  const statusFilters: { id: QuoteStatus | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'awaiting_customer', label: 'Aguardando cliente', count: counts.awaiting_customer },
    { id: 'approved', label: 'Aprovados', count: counts.approved },
    { id: 'rejected', label: 'Recusados', count: counts.rejected },
  ];

  const filteredQuotes = quotes.filter(quote => {
    if (selectedStatus !== 'all' && quote.status !== selectedStatus) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNumber = quote.quoteNumber.toLowerCase().includes(term);
      const matchCustomer = quote.customerName.toLowerCase().includes(term);
      const matchItem = quote.items.some(i => i.productName.toLowerCase().includes(term));
      const matchOrder = quote.arteflowSync?.arteflowOrderId?.toLowerCase().includes(term);
      return matchNumber || matchCustomer || matchItem || matchOrder;
    }
    return true;
  });

  const handleOpenQuoteDetails = (quoteId: string) => {
    if (onViewQuote) {
      onViewQuote(quoteId);
    } else {
      window.location.hash = `#/quotes/${quoteId}`;
    }
  };

  // Abertura do Modal de Envio por WhatsApp
  const handleOpenWhatsAppModal = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    if (!capabilities.canUseWhatsApp) {
      showNotice(
        'WhatsApp Não Configurado',
        'A integração oficial com o WhatsApp Business ainda não está configurada neste ambiente. Utilize o botão "Baixar PDF" para obter a proposta oficial em PDF.',
        'info'
      );
      return;
    }
    triggerRef.current = e.currentTarget as HTMLElement;
    const rawPhone = quote.customerContact || '';
    setQuoteForWhatsApp(quote);
    setWpRecipientPhone(rawPhone);
    setWpCustomMessage(`Olá, ${quote.customerName}! Segue a proposta comercial ${quote.quoteNumber} elaborada pela ${currentCompany.tradeName}.`);
  };

  // Confirmação e Disparo pelo WhatsApp
  const handleConfirmSendWhatsApp = () => {
    if (!quoteForWhatsApp) return;

    setIsSendingWhatsApp(true);
    try {
      const result = sendQuoteViaWhatsApp(quoteForWhatsApp.id, wpCustomMessage, wpRecipientPhone);
      if (result.success && result.messageUrl) {
        window.open(result.messageUrl, '_blank', 'noopener,noreferrer');
        handleCloseWhatsAppModal();
      }
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Orçamentos</h1>
          <p className="text-sm text-slate-500">
            Elabore propostas, aplique descontos comerciais, baixe o PDF e acompanhe as aprovações.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={onNewQuote}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          Novo Orçamento
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {statusFilters.map(filter => {
          const isActive = selectedStatus === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setSelectedStatus(filter.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <span>{filter.label}</span>
              <span className="px-1.5 py-0.2 rounded bg-white font-mono text-[10px] text-slate-500 border border-slate-200">
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:max-w-md">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nº do orçamento, cliente ou item..."
          />
        </div>
      </div>

      {/* Tabela de Orçamentos */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        {filteredQuotes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Nenhum orçamento encontrado"
              description="Não foram encontrados orçamentos com os critérios selecionados."
              actionLabel="Criar Novo Orçamento"
              onAction={onNewQuote}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Orçamento</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4">Subtotal / Desconto</th>
                  <th className="py-3 px-4">Total Final</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredQuotes.map(quote => {
                  const meta = QUOTE_STATUS_METADATA[quote.status];
                  const discountCents = quote.discount?.appliedAmountCents || quote.discountCents || 0;

                  return (
                    <tr
                      key={quote.id}
                      onClick={() => handleOpenQuoteDetails(quote.id)}
                      className="hover:bg-emerald-50/30 transition-colors cursor-pointer"
                    >
                      {/* Número e Data */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hover:text-emerald-600 transition-colors">{quote.quoteNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                          {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">
                          {quote.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {quote.customerContact || quote.customerEmail || 'Balcão'}
                        </div>
                      </td>

                      {/* Itens */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 line-clamp-1 max-w-[220px]">
                          {quote.items.map(i => i.productName).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {quote.items.length} {quote.items.length === 1 ? 'item' : 'itens'}
                        </div>
                      </td>

                      {/* Subtotal & Desconto */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-600">{formatCentsToBRL(quote.subtotalCents)}</div>
                        {discountCents > 0 ? (
                          <div className="text-[11px] text-emerald-600 font-semibold">
                            - {formatCentsToBRL(discountCents)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Sem desconto</div>
                        )}
                      </td>

                      {/* Total Final */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900">
                        {formatCentsToBRL(quote.totalCents)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            quote.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : quote.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {quote.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {quote.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {quote.status === 'awaiting_customer' && <Clock className="w-3 h-3 text-emerald-600" />}
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Baixar PDF do Orçamento"
                            icon={<Download className="w-3.5 h-3.5 text-emerald-600" />}
                            onClick={() => downloadQuotePdf(quote.id)}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Enviar pelo WhatsApp"
                            icon={<MessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
                            onClick={e => handleOpenWhatsAppModal(e, quote)}
                          />

                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenQuoteDetails(quote.id)}
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Disparo por WhatsApp */}
      {quoteForWhatsApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseWhatsAppModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enviar Orçamento por WhatsApp</h3>
                  <p className="text-xs text-slate-500">{quoteForWhatsApp.quoteNumber} • {quoteForWhatsApp.customerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseWhatsAppModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Número de WhatsApp do Cliente
                </label>
                <input
                  type="text"
                  value={wpRecipientPhone}
                  onChange={e => setWpRecipientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mensagem de Acompanhamento
                </label>
                <textarea
                  rows={4}
                  value={wpCustomMessage}
                  onChange={e => setWpCustomMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-900 font-mono text-[11px]">
                    {PdfExportService.getQuotePdfFilename(quoteForWhatsApp)}
                  </span>
                </div>
                <Badge variant="success" size="sm">PDF Anexo</Badge>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={handleCloseWhatsAppModal}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon={<Send className="w-3.5 h-3.5" />}
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                onClick={handleConfirmSendWhatsApp}
                disabled={isSendingWhatsApp || !wpRecipientPhone}
              >
                Confirmar e Abrir WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
