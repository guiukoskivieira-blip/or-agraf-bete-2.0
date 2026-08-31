/**
 * @file CustomersPage.tsx
 * @description Gestão Completa de Clientes e Contatos Comerciais (Light Theme)
 * @project OrçaGraf
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  X,
  Save,
  Edit2,
  Phone,
  Mail,
  Building2,
  UserCheck,
  UserX,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { SearchBar } from '../components/common/SearchBar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useCommercial } from '../context/CommercialContext';
import { useNotification } from '../context/NotificationContext';
import { Customer, CustomerType } from '../types/customer';
import { CustomerCreateInput, CustomerUpdateInput } from '../domain/customer-repository';

export const CustomersPage: React.FC = () => {
  const { customers, createCustomer, updateCustomer, toggleCustomerActive } = useCommercial();
  const { showNotice } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    type: CustomerType;
    name: string;
    corporateName: string;
    document: string;
    stateRegistration: string;
    email: string;
    phone: string;
    whatsapp: string;
    city: string;
    state: string;
    street: string;
    notes: string;
    isActive: boolean;
  }>({
    type: 'company',
    name: '',
    corporateName: '',
    document: '',
    stateRegistration: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    state: '',
    street: '',
    notes: '',
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; document?: string }>({});
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    triggerRef.current?.focus();
  };

  React.useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleOpenCreateModal = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingCustomer(null);
    setFormData({
      type: 'company',
      name: '',
      corporateName: '',
      document: '',
      stateRegistration: '',
      email: '',
      phone: '',
      whatsapp: '',
      city: '',
      state: '',
      street: '',
      notes: '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditingCustomer(customer);
    setFormData({
      type: customer.type || 'company',
      name: customer.name || '',
      corporateName: customer.corporateName || '',
      document: customer.document || '',
      stateRegistration: customer.stateRegistration || '',
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || customer.phone || '',
      city: customer.address?.city || '',
      state: customer.address?.state || '',
      street: customer.address?.street || '',
      notes: customer.notes || '',
      isActive: customer.isActive !== false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleActive = async (customer: Customer) => {
    await toggleCustomerActive(customer.id);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormErrors(prev => ({ ...prev, name: 'O nome ou razão social é obrigatório.' }));
      showNotice('Campo Obrigatório', 'Informe o nome ou razão social do cliente.', 'warning');
      return;
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setFormErrors(prev => ({ ...prev, email: 'Formato de e-mail inválido.' }));
        showNotice('E-mail Inválido', 'Por favor, informe um endereço de e-mail válido.', 'warning');
        return;
      }
    }

    const payload: CustomerCreateInput | CustomerUpdateInput = {
      type: formData.type,
      name: trimmedName,
      corporateName: formData.corporateName.trim() || undefined,
      document: formData.document.trim() || undefined,
      stateRegistration: formData.stateRegistration.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      whatsapp: formData.whatsapp.trim() || formData.phone.trim() || undefined,
      address:
        formData.city || formData.state || formData.street
          ? {
              street: formData.street.trim(),
              number: '',
              neighborhood: '',
              city: formData.city.trim(),
              state: formData.state.trim().toUpperCase(),
              zipCode: '',
            }
          : undefined,
      notes: formData.notes.trim() || undefined,
      isActive: formData.isActive,
    };

    if (editingCustomer) {
      const result = await updateCustomer(editingCustomer.id, payload);
      if (result.success) {
        setIsModalOpen(false);
      }
    } else {
      const result = await createCustomer(payload as CustomerCreateInput);
      if (result.success) {
        setIsModalOpen(false);
      }
    }
  };

  // Filtragem dos Clientes
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Filtro de status
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;

      // Filtro de busca
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const termCleanDoc = term.replace(/\D/g, '');
        const nameMatch = c.name.toLowerCase().includes(term);
        const corpMatch = (c.corporateName || '').toLowerCase().includes(term);
        const emailMatch = (c.email || '').toLowerCase().includes(term);
        const phoneMatch = (c.phone || '').includes(term) || (c.whatsapp || '').includes(term);
        const cityMatch = (c.address?.city || '').toLowerCase().includes(term);
        const docClean = (c.document || '').replace(/\D/g, '');
        const docMatch = (c.document || '').includes(term) || (termCleanDoc && docClean.includes(termCleanDoc));

        return nameMatch || corpMatch || emailMatch || phoneMatch || cityMatch || Boolean(docMatch);
      }

      return true;
    });
  }, [customers, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clientes & Contatos</h1>
          <p className="text-sm text-slate-500">
            Cadastre e consulte clientes, contatos comerciais e vincule diretamente às propostas.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Filter / Search Bar & Status Pills */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, razão social, CNPJ, telefone..."
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ativos ({customers.filter(c => c.isActive).length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-white text-slate-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inativos ({customers.filter(c => !c.isActive).length})
          </button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Cliente / Razão Social</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Documento</th>
                <th className="py-3.5 px-4">Contato Principal</th>
                <th className="py-3.5 px-4">Cidade / UF</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => {
                const isCompany = customer.type === 'company';
                const initial = customer.name.charAt(0).toUpperCase() || 'C';

                return (
                  <tr
                    key={customer.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !customer.isActive ? 'bg-slate-50/40 opacity-75' : ''
                    }`}
                  >
                    {/* Nome / Razão Social */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{customer.name}</p>
                          {customer.corporateName && customer.corporateName !== customer.name && (
                            <p className="text-xs text-slate-500 truncate">{customer.corporateName}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-4">
                      <Badge variant={isCompany ? 'blue' : 'slate'} size="sm">
                        {isCompany ? 'Pessoa Jurídica' : 'Pessoa Física'}
                      </Badge>
                    </td>

                    {/* Documento */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {customer.document || <span className="text-slate-400 italic">Não informado</span>}
                    </td>

                    {/* Contato Principal */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-[200px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {!customer.phone && !customer.email && (
                          <span className="text-xs text-slate-400 italic">Sem contato</span>
                        )}
                      </div>
                    </td>

                    {/* Cidade / UF */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {customer.address?.city ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {customer.address.city}
                            {customer.address.state ? ` - ${customer.address.state}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={customer.isActive ? 'green' : 'slate'} size="sm">
                        {customer.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(customer)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Editar cadastro do cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(customer)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            customer.isActive
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={customer.isActive ? 'Desativar cliente' : 'Reativar cliente'}
                        >
                          {customer.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="p-8">
            <EmptyState
              icon={<Users className="w-8 h-8 text-emerald-600" />}
              title={
                searchTerm || statusFilter !== 'all'
                  ? 'Nenhum cliente encontrado'
                  : 'Nenhum cliente cadastrado ainda'
              }
              description={
                searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca ou status para localizar o cliente.'
                  : 'Cadastre seus clientes para agilizar a elaboração de novos orçamentos no balcão.'
              }
              actionLabel={searchTerm || statusFilter !== 'all' ? 'Limpar Filtros' : 'Cadastrar Primeiro Cliente'}
              onAction={
                searchTerm || statusFilter !== 'all'
                  ? () => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }
                  : handleOpenCreateModal
              }
            />
          </div>
        )}
      </Card>

      {/* Modal de Criação / Edição de Cliente */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {editingCustomer ? <Edit2 className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCustomer ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingCustomer
                      ? `Atualize as informações de ${editingCustomer.name}`
                      : 'Preencha os dados cadastrais para o atendimento comercial'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tipo de Cliente (PF / PJ) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tipo de Pessoa
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'company' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.type === 'company'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Pessoa Jurídica (PJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'person' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.type === 'person'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Pessoa Física (PF)
                  </button>
                </div>
              </div>

              {/* Nome Principal */}
              <Input
                label={formData.type === 'company' ? 'Nome Fantasia / Nome Comercial *' : 'Nome Completo *'}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.type === 'company' ? 'Ex: Alfa Engenharia' : 'Ex: João Silva'}
                error={formErrors.name}
                required
              />

              {/* Razão Social (se PJ) */}
              {formData.type === 'company' && (
                <Input
                  label="Razão Social"
                  value={formData.corporateName}
                  onChange={e => setFormData({ ...formData, corporateName: e.target.value })}
                  placeholder="Ex: Alfa Engenharia e Construções Ltda"
                />
              )}

              {/* Documento e Inscrição Estadual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={formData.type === 'company' ? 'CNPJ' : 'CPF'}
                  value={formData.document}
                  onChange={e => setFormData({ ...formData, document: e.target.value })}
                  placeholder={formData.type === 'company' ? '00.000.000/0000-00' : '000.000.000-00'}
                  error={formErrors.document}
                />
                <Input
                  label={formData.type === 'company' ? 'Inscrição Estadual' : 'RG (Opcional)'}
                  value={formData.stateRegistration}
                  onChange={e => setFormData({ ...formData, stateRegistration: e.target.value })}
                  placeholder={formData.type === 'company' ? 'Isento ou número' : ''}
                />
              </div>

              {/* Contatos: Telefone e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Telefone / Contato"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
                <Input
                  label="WhatsApp Comercial"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
              </div>

              {/* E-mail */}
              <Input
                label="E-mail de Contato Comercial"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@cliente.com.br"
                error={formErrors.email}
              />

              {/* Endereço / Localização */}
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

              {/* Status Ativo */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Cliente ativo para elaboração de propostas comerciais
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                  {editingCustomer ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
