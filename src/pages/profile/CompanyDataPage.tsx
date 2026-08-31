/**
 * @file CompanyDataPage.tsx
 * @description Dados Cadastrais, Endereço e Parâmetros Comerciais da Gráfica
 * @route /profile/company
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import { Building2, Save, MapPin, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { SettingsLayout, SettingsTab } from '../../components/layout/SettingsLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';

interface CompanyDataPageProps {
  onNavigateSettings: (tab: SettingsTab) => void;
}

export const CompanyDataPage: React.FC<CompanyDataPageProps> = ({ onNavigateSettings }) => {
  const { currentCompany, updateCompanySettings, currentUser, checkPermission } = useTenant();
  const { showNotice } = useNotification();

  const canEdit = currentUser.role === 'owner' || currentUser.role === 'admin' || checkPermission('settings', 'edit');

  const [activeSubTab, setActiveSubTab] = useState<'info' | 'address' | 'commercial'>('info');

  const [form, setForm] = useState({
    tradeName: currentCompany.tradeName,
    corporateName: currentCompany.corporateName,
    document: currentCompany.document,
    stateRegistration: currentCompany.stateRegistration || '',
    email: currentCompany.email,
    phone: currentCompany.phone,
    whatsapp: currentCompany.whatsapp || '',
    website: currentCompany.website || '',
    managerName: currentCompany.managerName || '',
    street: currentCompany.address.street,
    number: currentCompany.address.number,
    complement: currentCompany.address.complement || '',
    neighborhood: currentCompany.address.neighborhood,
    city: currentCompany.address.city,
    state: currentCompany.address.state,
    zipCode: currentCompany.address.zipCode,
    defaultPaymentTerms: currentCompany.customization.defaultPaymentTerms || '',
    defaultProductionDays: currentCompany.customization.defaultProductionDays || 3,
    commercialNotes: currentCompany.customization.commercialNotes || '',
    headerNote: currentCompany.customization.headerNote || '',
    footerDisclaimer: currentCompany.customization.footerDisclaimer || '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tradeName.trim() || !form.document.trim()) {
      showNotice('Campos Obrigatórios', 'Nome fantasia e CNPJ são obrigatórios.', 'warning');
      return;
    }

    updateCompanySettings({
      tradeName: form.tradeName.trim(),
      corporateName: form.corporateName.trim(),
      document: form.document.trim(),
      stateRegistration: form.stateRegistration.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      website: form.website.trim(),
      managerName: form.managerName.trim(),
      address: {
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim(),
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
      },
      customization: {
        ...currentCompany.customization,
        defaultPaymentTerms: form.defaultPaymentTerms.trim(),
        defaultProductionDays: Number(form.defaultProductionDays) || 3,
        commercialNotes: form.commercialNotes.trim(),
        headerNote: form.headerNote.trim(),
        footerDisclaimer: form.footerDisclaimer.trim(),
      },
    });

    showNotice('Dados da Gráfica Salvos', 'As configurações e parâmetros foram atualizados.', 'success');
  };

  return (
    <SettingsLayout
      activeTab="company"
      onNavigate={onNavigateSettings}
      title="Dados da Gráfica"
      description="Gerencie os dados cadastrais, endereço e parâmetros padrão para as propostas e relatórios PDF."
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-6">
          {/* Sub-abas internas */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('info')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'info'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Identificação & Contato
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('address')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'address'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Endereço Físico
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('commercial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'commercial'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Parâmetros Comerciais & PDF
              </button>
            </div>
            {currentCompany.dataOrigin === 'demo' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Empresa demonstrativa
              </span>
            )}
          </div>

          {/* Sub-aba 1: Identificação & Contato */}
          {activeSubTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome Fantasia *"
                  value={form.tradeName}
                  onChange={e => setForm({ ...form, tradeName: e.target.value })}
                  placeholder="Nome comercial da gráfica"
                  required
                  disabled={!canEdit}
                />
                <Input
                  label="Razão Social"
                  value={form.corporateName}
                  onChange={e => setForm({ ...form, corporateName: e.target.value })}
                  placeholder="Razão social jurídica"
                  disabled={!canEdit}
                />
                <Input
                  label="CNPJ *"
                  value={form.document}
                  onChange={e => setForm({ ...form, document: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  required
                  disabled={!canEdit}
                />
                <Input
                  label="Inscrição Estadual"
                  value={form.stateRegistration}
                  onChange={e => setForm({ ...form, stateRegistration: e.target.value })}
                  placeholder="Isento ou nº estadual"
                  disabled={!canEdit}
                />
                <Input
                  label="E-mail Comercial"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@grafica.com.br"
                  disabled={!canEdit}
                />
                <Input
                  label="Telefone Comercial"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 0000-0000"
                  disabled={!canEdit}
                />
                <Input
                  label="WhatsApp da Empresa"
                  value={form.whatsapp}
                  onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="(00) 90000-0000"
                  disabled={!canEdit}
                />
                <Input
                  label="Website Oficial"
                  value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                  placeholder="www.grafica.com.br"
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}

          {/* Sub-aba 2: Endereço Físico */}
          {activeSubTab === 'address' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Logradouro / Rua"
                    value={form.street}
                    onChange={e => setForm({ ...form, street: e.target.value })}
                    placeholder="Rua, Avenida..."
                    disabled={!canEdit}
                  />
                </div>
                <Input
                  label="Número"
                  value={form.number}
                  onChange={e => setForm({ ...form, number: e.target.value })}
                  placeholder="123"
                  disabled={!canEdit}
                />
                <Input
                  label="Complemento"
                  value={form.complement}
                  onChange={e => setForm({ ...form, complement: e.target.value })}
                  placeholder="Galpão B, Sala 4..."
                  disabled={!canEdit}
                />
                <Input
                  label="Bairro"
                  value={form.neighborhood}
                  onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                  placeholder="Bairro"
                  disabled={!canEdit}
                />
                <Input
                  label="CEP"
                  value={form.zipCode}
                  onChange={e => setForm({ ...form, zipCode: e.target.value })}
                  placeholder="00000-000"
                  disabled={!canEdit}
                />
                <Input
                  label="Cidade"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="Cidade"
                  disabled={!canEdit}
                />
                <Input
                  label="UF / Estado"
                  value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  placeholder="SP"
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}

          {/* Sub-aba 3: Prazos & Parâmetros Comerciais */}
          {activeSubTab === 'commercial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prazo Padrão de Produção (Dias Úteis)"
                  type="number"
                  min={1}
                  value={form.defaultProductionDays}
                  onChange={e => setForm({ ...form, defaultProductionDays: Number(e.target.value) })}
                  disabled={!canEdit}
                />
                <Input
                  label="Condições Padrão de Pagamento"
                  value={form.defaultPaymentTerms}
                  onChange={e => setForm({ ...form, defaultPaymentTerms: e.target.value })}
                  placeholder="À vista via Pix ou Cartão"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Observações Comerciais nos Orçamentos e PDFs
                </label>
                <textarea
                  rows={3}
                  value={form.commercialNotes}
                  onChange={e => setForm({ ...form, commercialNotes: e.target.value })}
                  placeholder="Texto impresso no rodapé de propostas comerciais..."
                  className="w-full p-3 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Termo de Responsabilidade / Disclaimer (PDF)
                </label>
                <textarea
                  rows={2}
                  value={form.footerDisclaimer}
                  onChange={e => setForm({ ...form, footerDisclaimer: e.target.value })}
                  placeholder="Validade do orçamento: 7 dias corridos. Variação técnica de cor admitida até 10%..."
                  className="w-full p-3 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}

          {canEdit && (
            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                Salvar Dados da Gráfica
              </Button>
            </div>
          )}
        </Card>
      </form>
    </SettingsLayout>
  );
};
