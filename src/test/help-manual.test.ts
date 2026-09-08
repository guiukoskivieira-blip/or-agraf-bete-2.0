/**
 * @file help-manual.test.ts
 * @description Testes direcionados para o Mini Manual da Central de Ajuda (Etapa 2)
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runHelpManualTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Central de Ajuda — Mini Manual (Etapa 2)';

  try {
    const helpPagePath = path.resolve(__dirname, '../pages/HelpCenterPage.tsx');
    const content = fs.readFileSync(helpPagePath, 'utf-8');

    // 1. Primeiros passos
    const hasPrimeirosPassos = content.includes('Primeiros Passos') && content.includes('Fluxo Básico de Uso');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Primeiros Passos" com visão geral e fluxo básico',
      passed: hasPrimeirosPassos,
      error: !hasPrimeirosPassos ? 'Seção Primeiros Passos ausente ou incompleta' : undefined,
    });

    // 2. Dashboard
    const hasDashboard = content.includes('Dashboard') && content.includes('Total de Orçamentos') && content.includes('Ticket Médio');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Dashboard" com métricas reais e ações rápidas',
      passed: hasDashboard,
      error: !hasDashboard ? 'Seção Dashboard ausente ou incompleta' : undefined,
    });

    // 3. Clientes
    const hasClientes = content.includes('Gestão de Clientes') && content.includes('PF') && content.includes('PJ') && content.includes('Edição');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Clientes" com cadastro PF/PJ, consulta e edição',
      passed: hasClientes,
      error: !hasClientes ? 'Seção Clientes ausente ou incompleta' : undefined,
    });

    // 4. Catálogo
    const hasCatalogo = content.includes('Catálogo Comercial & Precificação') && content.includes('Insumos') && content.includes('Acabamentos');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Catálogo" com produtos, insumos, acabamentos e precificação',
      passed: hasCatalogo,
      error: !hasCatalogo ? 'Seção Catálogo ausente ou incompleta' : undefined,
    });

    // 5. Orçamentos
    const hasOrcamentos = content.includes('Orçamentos Comerciais') &&
                          content.includes('Descontos') &&
                          content.includes('Aprovação Comercial') &&
                          content.includes('PDF') &&
                          content.includes('WhatsApp');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Orçamentos" com criação, descontos, vendedor, salvar, aprovação, PDF e WhatsApp',
      passed: hasOrcamentos,
      error: !hasOrcamentos ? 'Seção Orçamentos ausente ou incompleta' : undefined,
    });

    // 6. Pedidos
    const hasPedidos = content.includes('Origem dos Pedidos') && content.includes('orçamento formalmente aprovado');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Pedidos" com relação com orçamentos aprovados',
      passed: hasPedidos,
      error: !hasPedidos ? 'Seção Pedidos ausente ou incompleta' : undefined,
    });

    // 7. Prexyon
    const hasPrexyon = content.includes('Ecossistema Prexyon') &&
                       content.includes('Barra Global') &&
                       content.includes('Portal Prexyon');
    results.push({
      suiteName,
      testName: 'Mini Manual contém seção "Prexyon" com ecossistema, troca de produtos e administração no Portal',
      passed: hasPrexyon,
      error: !hasPrexyon ? 'Seção Prexyon ausente ou incompleta' : undefined,
    });

    // 8. Ausência de busca ou formulário de reportar nesta etapa
    const hasNoReportForm = !content.includes('handleGenerateReport');
    const hasNoSearchInput = !content.includes('setSearchQuery');
    results.push({
      suiteName,
      testName: 'Não implementa busca nem formulário de reportar prematuramente',
      passed: hasNoReportForm && hasNoSearchInput,
      error: (!hasNoReportForm || !hasNoSearchInput) ? 'Encontrado formulário de reportar ou busca não solicitados' : undefined,
    });

  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Leitura de HelpCenterPage.tsx',
      passed: false,
      error: err.message,
    });
  }

  return results;
}
