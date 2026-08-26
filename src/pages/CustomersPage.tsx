/**
 * @file CustomersPage.tsx
 * @description Gestão de Clientes e Contatos Comerciais (Light Theme)
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import { Users, UserPlus, X, Save } from 'lucide-react';
import { SearchBar } from '../components/common/SearchBar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useNotification } from '../context/NotificationContext';

export const CustomersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotice } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    city: '',
    state: '',
  });

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotice('Campo Obrigatório', 'Informe o nome ou razão social do cliente.', 'warning');
      return;
    }
    showNotice('Cliente Cadastrado', `Cliente ${formData.name} foi adicionado à base comercial.`, 'success');
    setIsModalOpen(false);
    setFormData({ name: '', document: '', email: '', phone: '', city: '', state: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clientes & Contatos</h1>
          <p className="text-sm text-slate-500">
            Cadastre e consulte clientes, contatos comerciais e histórico de propostas.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:max-w-md">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, razão social, CNPJ, telefone ou WhatsApp..."
          />
        </div>
      </div>

      {/* Structural Table Header Preview with Clean Empty State */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Cliente / Razão Social</th>
                <th className="py-3.5 px-4">Documento</th>
                <th className="py-3.5 px-4">Contato Principal</th>
                <th className="py-3.5 px-4">Cidade / UF</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Empty state rows */}
            </tbody>
          </table>
        </div>

        <div className="p-6">
          <EmptyState
            icon={<Users className="w-8 h-8 text-teal-600" />}
            title="Nenhum cliente cadastrado ainda"
            description="Cadastre seus clientes para agilizar a elaboração de novos orçamentos no balcão."
            actionLabel="Cadastrar Primeiro Cliente"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      </Card>

      {/* Modal de Cadastro de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Cliente</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <Input
                label="Nome / Razão Social"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Alfa Comunicação Ltda"
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="CPF ou CNPJ"
                  value={formData.document}
                  onChange={e => setFormData({ ...formData, document: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
                <Input
                  label="Telefone / WhatsApp"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <Input
                label="E-mail de Contato"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@cliente.com"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Cidade"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <Input
                  label="UF"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
