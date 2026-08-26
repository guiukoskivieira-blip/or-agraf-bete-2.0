/**
 * @file QuickSearchModal.tsx
 * @description Modal de Busca Rápida e Atalhos de Teclado (Light Theme)
 * @project OrçaGraf
 */

import React, { useState, useEffect } from 'react';
import { Search, X, Users, Layers, FileText, LayoutGrid, PlusCircle, ArrowRight, User } from 'lucide-react';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modules: { id: string; title: string; subtitle: string; icon: React.ReactNode }[] = [
    { id: 'general', title: 'Página Geral', subtitle: 'Visão inicial e resumo comercial', icon: <LayoutGrid className="w-4 h-4 text-blue-600" /> },
    { id: 'new-quote', title: 'Novo Orçamento', subtitle: 'Criar e emitir nova proposta comercial', icon: <PlusCircle className="w-4 h-4 text-emerald-600" /> },
    { id: 'quotes', title: 'Orçamentos', subtitle: 'Propostas comerciais, aprovações, PDF e WhatsApp', icon: <FileText className="w-4 h-4 text-blue-600" /> },
    { id: 'customers', title: 'Clientes & Contatos', subtitle: 'Cadastro de clientes PJ/PF e contatos comerciais', icon: <Users className="w-4 h-4 text-teal-600" /> },
    { id: 'catalog', title: 'Catálogo Comercial', subtitle: 'Produtos gráficos, insumos/substratos e acabamentos', icon: <Layers className="w-4 h-4 text-indigo-600" /> },
    { id: 'profile', title: 'Meu Perfil & Configurações', subtitle: 'Dados da gráfica, usuários, permissões e integrações', icon: <User className="w-4 h-4 text-slate-600" /> },
  ];

  const filtered = modules.filter(
    m => m.title.toLowerCase().includes(query.toLowerCase()) || m.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Navegar para módulo ou pesquisar..."
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navegação Rápida
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Nenhum módulo correspondente a &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-left transition-colors group cursor-pointer border border-transparent hover:border-slate-200/80"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500">{item.subtitle}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Pressione <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">ESC</kbd> para fechar</span>
          <span className="text-blue-600 font-semibold">OrçaGraf</span>
        </div>
      </div>
    </div>
  );
};
