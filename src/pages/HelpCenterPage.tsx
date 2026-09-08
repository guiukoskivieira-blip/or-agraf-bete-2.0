/**
 * @file HelpCenterPage.tsx
 * @description Central de Ajuda Oficial do OrçaGraf com Mini Manual e Gerador de Relatório de Suporte
 * @route /help
 * @project OrçaGraf
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Zap,
  LayoutGrid,
  Users,
  Tags,
  FileText,
  ShoppingBag,
  Globe,
  ChevronDown,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  MessageCircleQuestion,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNotification } from '../context/NotificationContext';

interface HelpCenterPageProps {
  onNavigate?: (tab: string) => void;
}

type HelpCenterTab = 'manual' | 'report';
type ReportType = 'Bug' | 'Melhoria' | 'Dúvida';
type ReportArea =
  | 'Dashboard'
  | 'Clientes'
  | 'Catálogo'
  | 'Produtos'
  | 'Insumos'
  | 'Acabamentos'
  | 'Orçamentos'
  | 'Pedidos'
  | 'Perfil'
  | 'Integração Prexyon'
  | 'Outro';

interface ManualSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  topics: {
    title: string;
    points: string[];
  }[];
}

const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'primeiros-passos',
    number: '01',
    title: 'Primeiros Passos',
    subtitle: 'Visão geral e fluxo de trabalho essencial do OrçaGraf.',
    icon: Zap,
    topics: [
      {
        title: 'Visão Geral da Plataforma',
        points: [
          'O OrçaGraf é o sistema de engenharia de custos, catálogo comercial e emissão ágil de orçamentos para gráficas e comunicação visual.',
          'Permite calcular o custo real de materiais e serviços, aplicar markups e emitir propostas com numeração sequencial controlada.',
        ],
      },
      {
        title: 'Fluxo Básico de Uso',
        points: [
          '1. Selecionar ou cadastrar o Cliente na base comercial.',
          '2. Iniciar um Novo Orçamento selecionando os produtos do catálogo ou configurando medidas e acabamentos sob medida.',
          '3. Definir quantidades, insumos (papéis, lonas, vinis) e processos de acabamento.',
          '4. Aplicar descontos comerciais quando necessário e conferir o valor total calculado.',
          '5. Salvar a proposta, emitir o espelho em PDF ou compartilhar via WhatsApp com o cliente.',
          '6. Registrar a aprovação do orçamento para formalizar o fechamento comercial.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    number: '02',
    title: 'Dashboard (Visão Geral)',
    subtitle: 'Indicadores de vendas e atalhos operacionais em tempo real.',
    icon: LayoutGrid,
    topics: [
      {
        title: 'Métricas e Indicadores',
        points: [
          'Total de Orçamentos: contagem geral de propostas geradas no período.',
          'Valor Total Orçado: soma do valor financeiro de todas as propostas emitidas.',
          'Ticket Médio: média de valor por proposta comercial.',
          'Taxa de Conversão: percentual de orçamentos aprovados em relação ao total emitido.',
        ],
      },
      {
        title: 'Listagem Recente e Ações Rápidas',
        points: [
          'Tabela de orçamentos recentes com status visual atualizado.',
          'Acesso imediato aos detalhes de qualquer proposta recente.',
          'Botão de ação rápida "Novo Orçamento" no topo da página.',
        ],
      },
    ],
  },
  {
    id: 'clientes',
    number: '03',
    title: 'Gestão de Clientes',
    subtitle: 'Cadastro, consulta rápida e histórico comercial.',
    icon: Users,
    topics: [
      {
        title: 'Cadastro de Clientes',
        points: [
          'Suporte a Pessoa Física (PF com CPF) e Pessoa Jurídica (PJ com CNPJ e Razão Social).',
          'Campos de contato essenciais: WhatsApp, telefone, e-mail comercial e endereço completo.',
        ],
      },
      {
        title: 'Consulta e Edição',
        points: [
          'Busca instantânea por nome, razão social, documento ou e-mail na listagem.',
          'Edição de dados cadastrais e atualização de contatos existentes.',
          'Histórico consolidado com os orçamentos emitidos para cada cliente.',
        ],
      },
    ],
  },
  {
    id: 'catalogo',
    number: '04',
    title: 'Catálogo Comercial & Precificação',
    subtitle: 'Produtos, insumos, acabamentos e motor de cálculo técnico.',
    icon: Tags,
    topics: [
      {
        title: 'Produtos Gráficos',
        points: [
          'Itens pré-configurados com formatos padrão, unidade de venda (unidade, m², milheiro) e margem de lucro sugerida.',
        ],
      },
      {
        title: 'Insumos e Matérias-Primas',
        points: [
          'Cadastro de papéis (offset, couchê, duplex), lonas, vinis adesivos e substratos rígidos.',
          'Configuração de custo por folha/metro e aproveitamento por formato.',
        ],
      },
      {
        title: 'Acabamentos Gráficos',
        points: [
          'Processos como refile, laminação BOPP (brilho/fosco), vinco, dobra, verniz UV e ilhós.',
          'Custo de processamento técnico por passada ou por unidade.',
        ],
      },
      {
        title: 'Motor de Precificação',
        points: [
          'Cálculo automático do custo técnico somando insumos, acabamentos e perdas operacionais, aplicando a margem de contribuição definida.',
        ],
      },
    ],
  },
  {
    id: 'orcamentos',
    number: '05',
    title: 'Orçamentos Comerciais',
    subtitle: 'Criação, descontos, vendedor, aprovação, PDF e WhatsApp.',
    icon: FileText,
    topics: [
      {
        title: 'Criação e Composição de Itens',
        points: [
          'Adição de múltiplos itens por proposta com personalização de dimensões e tiragens.',
          'Cálculo em tempo real de custos, subtotal e total conforme alterações nos itens.',
        ],
      },
      {
        title: 'Descontos e Responsável',
        points: [
          'Aplicação de descontos comerciais em percentual (%) ou valor fixo (R$).',
          'Associação do vendedor/responsável pela emissão do orçamento.',
        ],
      },
      {
        title: 'Salvar e Numeração Sequencial',
        points: [
          'Gravação atômica gerando código sequencial oficial (ex: ORC-2026-0001).',
          'Controle de versão para integridade dos dados.',
        ],
      },
      {
        title: 'Aprovação Comercial',
        points: [
          'Aprovação da proposta pela tela de detalhes, com registro imutável de data, hora e responsável.',
          'Orçamentos aprovados ficam protegidos contra alterações acidentais.',
        ],
      },
      {
        title: 'Exportação em PDF e Compartilhamento WhatsApp',
        points: [
          'Geração e download do espelho da proposta comercial em PDF.',
          'Ação de envio com mensagem e resumo estruturado via WhatsApp.',
        ],
      },
    ],
  },
  {
    id: 'pedidos',
    number: '06',
    title: 'Origem dos Pedidos',
    subtitle: 'Relação entre propostas comerciais aprovadas e produção.',
    icon: ShoppingBag,
    topics: [
      {
        title: 'Fluxo de Pedidos',
        points: [
          'No fluxo do sistema, todo pedido tem origem em um orçamento formalmente aprovado pelo cliente.',
          'O orçamento aprovado consolida as especificações técnicas de tiragem, formato, substrato e acabamentos para a produção.',
        ],
      },
    ],
  },
  {
    id: 'prexyon',
    number: '07',
    title: 'Ecossistema Prexyon & SSO',
    subtitle: 'Navegação entre produtos e administração centralizada.',
    icon: Globe,
    topics: [
      {
        title: 'Integração no Ecossistema',
        points: [
          'O OrçaGraf faz parte da suíte integrada Prexyon com ArteFlow (gestão de pedidos/produção) e ArteCheck (conferência de arquivos).',
          'Troca rápida entre softwares pelo seletor de produtos na Barra Global superior (#031225) com Prexyon SSO V2.',
        ],
      },
      {
        title: 'Administração Centralizada',
        points: [
          'Cadastro de colaboradores, permissões de acesso, organização e plano de assinatura são administrados no Portal Prexyon.',
        ],
      },
    ],
  },
];

const REPORT_AREAS: ReportArea[] = [
  'Dashboard',
  'Clientes',
  'Catálogo',
  'Produtos',
  'Insumos',
  'Acabamentos',
  'Orçamentos',
  'Pedidos',
  'Perfil',
  'Integração Prexyon',
  'Outro',
];

export const HelpCenterPage: React.FC<HelpCenterPageProps> = () => {
  const { showNotice } = useNotification();
  const [activeTab, setActiveTab] = useState<HelpCenterTab>('manual');
  const [openSectionId, setOpenSectionId] = useState<string | null>('primeiros-passos');

  // Estado do formulário de Reportar
  const [reportType, setReportType] = useState<ReportType>('Bug');
  const [reportArea, setReportArea] = useState<ReportArea>('Orçamentos');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSteps, setReportSteps] = useState('');
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSectionId(prev => (prev === id ? null : id));
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setIsCopied(true);
      const feedback = 'Relatório copiado. Envie-o ao suporte da Prexyon.';
      setFeedbackMessage(feedback);
      showNotice('Relatório Copiado', feedback, 'success');
      setTimeout(() => {
        setIsCopied(false);
      }, 4000);
    } catch {
      showNotice('Aviso', 'Selecione e copie o texto do relatório abaixo.', 'warning');
    }
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações obrigatórias
    if (!reportTitle.trim()) {
      showNotice('Campo Obrigatório', 'Informe um título para o relatório.', 'warning');
      return;
    }

    if (!reportDescription.trim()) {
      showNotice('Campo Obrigatório', 'Preencha a descrição detalhada.', 'warning');
      return;
    }

    if (reportType === 'Bug' && !reportSteps.trim()) {
      showNotice('Passos Obrigatórios', 'Para relatos do tipo Bug, informe os passos para reproduzir.', 'warning');
      return;
    }

    const timestamp = new Date().toLocaleString('pt-BR');
    const stepsLine =
      reportType === 'Bug'
        ? `Passos para reproduzir:\n${reportSteps.trim()}`
        : reportSteps.trim()
        ? `Passos para reproduzir:\n${reportSteps.trim()}`
        : 'Passos para reproduzir:\nN/A';

    // Formato oficial do relatório local (Zero tokens, zero secrets, zero dados sensíveis)
    const reportText = `Produto: OrçaGraf
Tipo: ${reportType}
Área: ${reportArea}
Título: ${reportTitle.trim()}
Descrição:
${reportDescription.trim()}
${stepsLine}
Data/hora: ${timestamp}`;

    setGeneratedReport(reportText);
    copyToClipboard(reportText);
  };

  const handleResetForm = () => {
    setReportTitle('');
    setReportDescription('');
    setReportSteps('');
    setGeneratedReport(null);
    setIsCopied(false);
    setFeedbackMessage(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho Principal */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              <span>Central de Ajuda</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Encontre orientações rápidas ou prepare um relatório para o suporte.
            </p>
          </div>
        </div>

        {/* Abas de Navegação Interna */}
        <div className="flex items-center gap-2 mt-6 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mini Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Reportar</span>
          </button>
        </div>
      </div>

      {/* Aba 1: Mini Manual */}
      {activeTab === 'manual' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                <BookOpen className="w-3.5 h-3.5" />
                Mini Manual
              </span>
              <span className="text-xs text-slate-500 font-medium">7 seções operacionais</span>
            </div>
          </div>

          {/* Lista de Accordions do Mini Manual */}
          <div className="space-y-3">
            {MANUAL_SECTIONS.map(section => {
              const isOpen = openSectionId === section.id;
              const Icon = section.icon;

              return (
                <Card
                  key={section.id}
                  className={`p-0 overflow-hidden bg-white border transition-all ${
                    isOpen
                      ? 'border-emerald-400/80 shadow-xs ring-1 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                          isOpen ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                            Seção {section.number}
                          </span>
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                          {section.title}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 border-t border-slate-100 bg-slate-50/30 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed pt-4">
                      {section.topics.map((topic, topicIdx) => (
                        <div key={topicIdx} className="space-y-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            {topic.title}
                          </h3>
                          <ul className="space-y-1.5 pl-1">
                            {topic.points.map((point, pointIdx) => (
                              <li key={pointIdx} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                                <span className="leading-normal">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Aba 2: Reportar */}
      {activeTab === 'report' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Reportar Problema, Melhoria ou Dúvida</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gere um relatório local formatado para enviar diretamente ao suporte da Prexyon.
              </p>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tipo *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Bug', 'Melhoria', 'Dúvida'] as ReportType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReportType(t)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        reportType === t
                          ? t === 'Bug'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : t === 'Melhoria'
                            ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                            : 'bg-sky-50 border-sky-400 text-sky-800 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'Bug' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : t === 'Melhoria' ? (
                        <Lightbulb className="w-3.5 h-3.5" />
                      ) : (
                        <MessageCircleQuestion className="w-3.5 h-3.5" />
                      )}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Área e Título */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Área *
                  </label>
                  <select
                    value={reportArea}
                    onChange={e => setReportArea(e.target.value as ReportArea)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  >
                    {REPORT_AREAS.map(area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Input
                    label="Título *"
                    value={reportTitle}
                    onChange={e => setReportTitle(e.target.value)}
                    placeholder="Ex: Erro no cálculo de acabamento"
                    required
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Descrição *
                </label>
                <textarea
                  rows={4}
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  placeholder="Descreva detalhadamente a situação, melhoria ou dúvida..."
                  className="w-full p-3 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  required
                />
              </div>

              {/* Passos para reproduzir (Exibido para Bug como obrigatório, e para outros como opcional) */}
              {reportType === 'Bug' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Passos para reproduzir *
                  </label>
                  <textarea
                    rows={3}
                    value={reportSteps}
                    onChange={e => setReportSteps(e.target.value)}
                    placeholder="1. Acessei o menu Orçamentos&#10;2. Cliquei em Novo Orçamento&#10;3. Ocorreu o erro..."
                    className="w-full p-3 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Passos para reproduzir (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={reportSteps}
                    onChange={e => setReportSteps(e.target.value)}
                    placeholder="Passos adicionais ou contexto complementar..."
                    className="w-full p-3 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                {generatedReport && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleResetForm}>
                    Limpar
                  </Button>
                )}
                <Button type="submit" variant="primary" icon={<Copy className="w-4 h-4" />}>
                  Copiar relatório
                </Button>
              </div>
            </form>
          </Card>

          {/* Feedback e Relatório Gerado Localmente */}
          {generatedReport && (
            <Card className="p-6 bg-slate-900 text-white border-slate-800 shadow-md space-y-3.5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Relatório Gerado Localmente
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-transparent text-xs font-bold"
                  icon={isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={() => copyToClipboard(generatedReport)}
                >
                  {isCopied ? 'Copiado!' : 'Copiar relatório'}
                </Button>
              </div>

              {feedbackMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-xs text-emerald-300 font-medium">
                  {feedbackMessage}
                </div>
              )}

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {generatedReport}
              </pre>

              <p className="text-[11px] text-slate-400 text-center">
                Relatório gerado localmente no navegador. Não contém dados sensíveis nem credenciais de acesso.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
