/**
 * @file HelpCenterPage.tsx
 * @description Central de Ajuda Oficial do OrçaGraf com Mini Manual (Etapa 2)
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
} from 'lucide-react';
import { Card } from '../components/ui/Card';

interface HelpCenterPageProps {
  onNavigate?: (tab: string) => void;
}

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

export const HelpCenterPage: React.FC<HelpCenterPageProps> = () => {
  const [openSectionId, setOpenSectionId] = useState<string | null>('primeiros-passos');

  const toggleSection = (id: string) => {
    setOpenSectionId(prev => (prev === id ? null : id));
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
      </div>

      {/* Seção Mini Manual */}
      <div className="space-y-4">
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
    </div>
  );
};
