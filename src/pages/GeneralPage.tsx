/**
 * @file GeneralPage.tsx
 * @description Visão Geral Comercial do OrçaGraf com Navegação Direta para Detalhes dos Orçamentos
 * @project OrçaGraf
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  PlusCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTenant } from '../context/TenantContext';
import { useCommercial } from '../context/CommercialContext';
import { formatCentsToBRL } from '../domain/money';
import { QUOTE_STATUS_METADATA } from '../domain/quote-status';
import { hasUserPermission } from '../types/tenant';
import { Quote } from '../types/quote';

interface GeneralPageProps {
  onNavigate: (route: string) => void;
  onNewQuote: () => void;
}

export const GeneralPage: React.FC<GeneralPageProps> = ({ onNavigate, onNewQuote }) => {
  const { currentCompany, currentUser } = useTenant();
  const { quotes, metrics, approveQuote } = useCommercial();

  // Estado para confirmação de aprovação rápida
  const [quoteToApprove, setQuoteToApprove] = useState<Quote | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Permissão de aprovação
  const canApprove = useMemo(() => {
    if (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager') {
      return true;
    }
    return hasUserPermission(currentUser, 'quotes', 'approve');
  }, [currentUser]);

  const handleOpenQuoteDetails = (quoteId: string) => {
    onNavigate(`quotes/${quoteId}`);
  };

  const handleKeyDownQuote = (e: React.KeyboardEvent, quoteId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenQuoteDetails(quoteId);
    }
  };

  const handleConfirmApprove = () => {
    if (!quoteToApprove || isApproving) return;
    setIsApproving(true);
    try {
      approveQuote(quoteToApprove.id);
      setQuoteToApprove(null);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
              {currentCompany.tradeName}
            </span>
            <span className="text-xs text-blue-100 font-medium">OrçaGraf Comercial</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Olá, {currentUser.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-blue-100 max-w-xl">
            Elabore propostas gráficas, aplique descontos comerciais, gere e baixe propostas em PDF profissional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewQuote}
            className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-98 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <Card className="p-5 bg-white border-slate-200 flex items-center gap-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aguardando Cliente</div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{metrics.awaitingQuotes}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{formatCentsToBRL(metrics.totalAwaitingValueCents)}</div>
          </div>
        </Card>

        <Card className="p-5 bg-white border-slate-200 flex items-center gap-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orçamentos Aprovados</div>
            <div className="text-2xl font-black text-emerald-600 leading-tight">{metrics.approvedQuotes}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{formatCentsToBRL(metrics.totalApprovedValueCents)}</div>
          </div>
        </Card>
      </div>

      {/* Recent Quotes com Clique Inteiro no Card abrindo a rota /quotes/:quoteId */}
      <div className="w-full">
        <Card className="p-6 space-y-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Últimos Orçamentos Registrados
              </h2>
            </div>
            <button
              onClick={() => onNavigate('quotes')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos os orçamentos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {quotes.slice(0, 6).map(quote => {
              const meta = QUOTE_STATUS_METADATA[quote.status];
              return (
                <div
                  key={quote.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenQuoteDetails(quote.id)}
                  onKeyDown={e => handleKeyDownQuote(e, quote.id)}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 hover:bg-blue-50/40 hover:border-blue-300 transition-all flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 group"
                  aria-label={`Abrir detalhes do orçamento ${quote.quoteNumber} para ${quote.customerName}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
                        {quote.quoteNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          quote.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : quote.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate mt-1">
                      {quote.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {quote.items.map(i => i.productName).join(', ')} • {quote.items.length} {quote.items.length === 1 ? 'item' : 'itens'} • {quote.paymentTerms || 'À vista'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-mono">Total Final</div>
                      <div className="text-base font-extrabold text-slate-900 font-mono">
                        {formatCentsToBRL(quote.totalCents)}
                      </div>
                    </div>

                    {/* Botão de Aprovação na Página Geral */}
                    {quote.status === 'awaiting_customer' && canApprove && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setQuoteToApprove(quote);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:shadow transition-all cursor-pointer shrink-0 border border-blue-700 active:scale-95"
                        title="Aprovar este orçamento"
                        aria-label={`Aprovar orçamento ${quote.quoteNumber}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprovar</span>
                      </button>
                    )}

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal de Confirmação de Aprovação */}
      {quoteToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900">
            <div className="p-4 border-b border-slate-200 bg-blue-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Confirmar Aprovação do Orçamento</span>
              </div>
              <button
                type="button"
                onClick={() => !isApproving && setQuoteToApprove(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                disabled={isApproving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Número:</span>
                  <span className="font-mono font-bold text-slate-900">{quoteToApprove.quoteNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{quoteToApprove.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 pt-1.5 border-t border-slate-200">
                  <span>Valor Total:</span>
                  <span className="font-mono font-black text-sm text-blue-600">
                    {formatCentsToBRL(quoteToApprove.totalCents)}
                  </span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Aprovar este orçamento? Após a aprovação, os dados ficarão disponíveis para envio ao ArteFlow.
              </p>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setQuoteToApprove(null)}
                disabled={isApproving}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-bold"
                onClick={handleConfirmApprove}
                disabled={isApproving}
              >
                {isApproving ? 'Processando...' : 'Confirmar aprovação'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
