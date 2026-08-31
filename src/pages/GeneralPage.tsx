import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, FileText, Filter, List, Plus, Users, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useCommercial } from '../context/CommercialContext';
import { useTenant } from '../context/TenantContext';
import { formatCentsToBRL } from '../domain/money';
import { QUOTE_STATUS_METADATA } from '../domain/quote-status';
import { hasUserPermission } from '../types/tenant';
import { Quote } from '../types/quote';

interface GeneralPageProps { onNavigate: (route: string) => void; onNewQuote: () => void }

export const GeneralPage: React.FC<GeneralPageProps> = ({ onNavigate, onNewQuote }) => {
  const { currentUser } = useTenant();
  const { quotes, metrics, customers, approveQuote } = useCommercial();
  const [quoteToApprove, setQuoteToApprove] = useState<Quote | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const canApprove = useMemo(() => ['owner', 'admin', 'manager'].includes(currentUser.role) || hasUserPermission(currentUser, 'quotes', 'approve'), [currentUser]);
  const activeCustomers = customers.filter(customer => customer.isActive).length;
  const statusRows = [
    { key: 'awaiting_customer', label: 'Aguardando cliente', count: metrics.awaitingQuotes, color: 'bg-emerald-500' },
    { key: 'approved', label: 'Aprovados', count: metrics.approvedQuotes, color: 'bg-emerald-600' },
    { key: 'rejected', label: 'Recusados', count: metrics.rejectedQuotes, color: 'bg-red-500' },
  ];
  const total = Math.max(metrics.totalQuotes, 1);
  const handleCloseApproveModal = () => { if (!isApproving) { setQuoteToApprove(null); triggerRef.current?.focus(); } };
  const confirmApproval = () => { if (!quoteToApprove || isApproving) return; setIsApproving(true); try { approveQuote(quoteToApprove.id); setQuoteToApprove(null); } finally { setIsApproving(false); } };

  React.useEffect(() => {
    if (!quoteToApprove) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && handleCloseApproveModal();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quoteToApprove, isApproving]);

  const cards = [
    { label: 'Aguardando cliente', value: metrics.awaitingQuotes.toString(), detail: 'orçamentos', icon: Clock3 },
    { label: 'Orçamentos aprovados', value: metrics.approvedQuotes.toString(), detail: 'orçamentos', icon: CheckCircle2 },
    { label: 'Clientes ativos', value: activeCustomers.toString(), detail: 'clientes', icon: Users },
    { label: 'Valor aprovado', value: formatCentsToBRL(metrics.totalApprovedValueCents), detail: 'valor total', icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-950 lg:text-[34px]">Visão geral comercial</h1><p className="mt-1.5 text-sm text-slate-500 lg:text-base">Acompanhe oportunidades, propostas e resultados da sua gráfica.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onNewQuote} icon={<Plus className="h-5 w-5" />}>Novo orçamento</Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate('quotes')} icon={<List className="h-5 w-5" />}>Ver orçamentos</Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores comerciais">
        {cards.map(({ label, value, detail, icon: Icon }) => <article key={label} className="min-h-[176px] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3"><span className="text-sm font-medium text-slate-800">{label}</span><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Icon className="h-6 w-6" /></span></div>
          <div className="mt-4 text-[30px] font-bold leading-none text-emerald-600">{value}</div><div className="mt-2 text-sm text-slate-500">{detail}</div>
        </article>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_5px_20px_rgba(15,23,42,0.04)]">
          <header className="flex items-center gap-3 border-b border-slate-100 pb-5"><Filter className="h-6 w-6 text-emerald-600" /><h2 className="text-lg font-semibold">Pipeline de orçamentos</h2></header>
          <div className="divide-y divide-slate-100">{statusRows.map(row => { const percent = Math.round(row.count / total * 100); return <div key={row.key} className="grid grid-cols-[minmax(125px,1fr)_minmax(110px,1.4fr)] items-center gap-3 py-5 text-sm sm:grid-cols-[minmax(120px,1fr)_minmax(100px,1.4fr)_35px_45px]"><span>{row.label}</span><span className="h-3 overflow-hidden rounded bg-slate-100" title={`${row.count} orçamento(s), ${percent}%`}><span className={`block h-full rounded ${row.color}`} style={{ width: `${percent}%` }} /></span><strong className="hidden sm:block">{row.count}</strong><span className="hidden text-right text-slate-500 sm:block">{percent}%</span></div>; })}</div>
          <div className="flex justify-between border-t border-slate-100 pt-5 text-sm"><span>Total de orçamentos no período</span><strong className="text-lg">{metrics.totalQuotes}</strong></div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_5px_20px_rgba(15,23,42,0.04)]">
          <header className="flex items-center gap-3 border-b border-slate-100 pb-5"><CheckCircle2 className="h-6 w-6 text-emerald-600" /><h2 className="text-lg font-semibold">Ações comerciais</h2></header>
          <div className="divide-y divide-slate-100">{quotes.slice(0, 5).map(quote => { const meta = QUOTE_STATUS_METADATA[quote.status]; return <div key={quote.id} role="button" tabIndex={0} onClick={() => onNavigate(`quotes/${quote.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onNavigate(`quotes/${quote.id}`); }} className="group flex cursor-pointer flex-col gap-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-950">{quote.quoteNumber} — {quote.items[0]?.productName || 'Proposta comercial'}</div><div className="mt-1 truncate text-sm text-slate-500">Cliente: {quote.customerName}</div></div>
            <div className="flex items-center justify-between gap-3 sm:justify-end"><div className="text-right"><div className={`text-sm font-medium ${quote.status === 'rejected' ? 'text-red-600' : 'text-emerald-600'}`}>{meta.label}</div><div className="mt-1 text-xs text-slate-500">Atualizado: {new Intl.DateTimeFormat('pt-BR').format(new Date(quote.updatedAt))}</div></div>
            {quote.status === 'awaiting_customer' && canApprove && <button onClick={event => { event.stopPropagation(); triggerRef.current = event.currentTarget; setQuoteToApprove(quote); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Aprovar orçamento ${quote.quoteNumber}`}>Aprovar</button>}<ChevronRight className="h-5 w-5 text-emerald-600" /></div>
          </div>; })}</div>
          <button onClick={() => onNavigate('quotes')} className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500">Ver todas as ações <ArrowRight className="h-4 w-4" /></button>
        </article>
      </section>

      {quoteToApprove && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={event => event.target === event.currentTarget && handleCloseApproveModal()}><div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Confirmar aprovação</div><button onClick={handleCloseApproveModal} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Fechar"><X className="h-5 w-5" /></button></header><div className="space-y-4 p-5"><div className="rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Orçamento</span><strong>{quoteToApprove.quoteNumber}</strong></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Valor</span><strong className="text-emerald-700">{formatCentsToBRL(quoteToApprove.totalCents)}</strong></div></div><p className="text-sm text-slate-600">O orçamento será registrado como aprovado comercialmente no OrçaGraf.</p></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4"><Button variant="ghost" onClick={handleCloseApproveModal}>Cancelar</Button><Button onClick={confirmApproval} disabled={isApproving}>{isApproving ? 'Processando...' : 'Confirmar aprovação'}</Button></footer></div></div>}
    </div>
  );
};
