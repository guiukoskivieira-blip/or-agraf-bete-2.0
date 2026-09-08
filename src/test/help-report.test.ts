/**
 * @file help-report.test.ts
 * @description Testes direcionados para a área Reportar da Central de Ajuda (Etapa 3)
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runHelpReportTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Central de Ajuda — Reportar Problema / Sugestão (Etapa 3)';

  try {
    const helpPagePath = path.resolve(__dirname, '../pages/HelpCenterPage.tsx');
    const content = fs.readFileSync(helpPagePath, 'utf-8');

    // 1. Tipos de notificação
    const hasBugType = content.includes("'Bug'");
    const hasMelhoriaType = content.includes("'Melhoria'");
    const hasDuvidaType = content.includes("'Dúvida'");
    results.push({
      suiteName,
      testName: 'Formulário disponibiliza os tipos Bug, Melhoria e Dúvida',
      passed: hasBugType && hasMelhoriaType && hasDuvidaType,
      error: (!hasBugType || !hasMelhoriaType || !hasDuvidaType) ? 'Tipos incompletos' : undefined,
    });

    // 2. Áreas do sistema
    const expectedAreas = [
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
    const allAreasPresent = expectedAreas.every(area => content.includes(`'${area}'`) || content.includes(`"${area}"`));
    results.push({
      suiteName,
      testName: 'Formulário disponibiliza todas as 11 áreas do sistema',
      passed: allAreasPresent,
      error: !allAreasPresent ? 'Áreas incompletas no seletor' : undefined,
    });

    // 3. Validação de obrigatoriedade
    const hasMandatoryValidation = content.includes('!reportTitle.trim()') &&
                                  content.includes('!reportDescription.trim()');
    results.push({
      suiteName,
      testName: 'Título e Descrição possuem validação obrigatória',
      passed: hasMandatoryValidation,
      error: !hasMandatoryValidation ? 'Validação de campos obrigatórios ausente' : undefined,
    });

    // 4. Passos para reproduzir obrigatório para Bug e opcional para Melhoria/Dúvida
    const hasBugStepsValidation = content.includes("reportType === 'Bug' && !reportSteps.trim()");
    const hasConditionalRendering = content.includes("reportType === 'Bug' ?");
    results.push({
      suiteName,
      testName: 'Passos para reproduzir são obrigatórios para Bug e opcionais para Melhoria/Dúvida',
      passed: hasBugStepsValidation && hasConditionalRendering,
      error: (!hasBugStepsValidation || !hasConditionalRendering) ? 'Regra de passos de Bug inconsistente' : undefined,
    });

    // 5. Geração local do relatório
    const hasReportTemplate = content.includes('Produto: OrçaGraf') &&
                              content.includes('Tipo: ${reportType}') &&
                              content.includes('Área: ${reportArea}') &&
                              content.includes('Título: ${reportTitle.trim()}') &&
                              content.includes('Descrição:') &&
                              content.includes('Passos para reproduzir:') &&
                              content.includes('Data/hora:');
    results.push({
      suiteName,
      testName: 'Relatório estruturado gerado localmente com todos os campos solicitados',
      passed: hasReportTemplate,
      error: !hasReportTemplate ? 'Template do relatório estruturado incompleto' : undefined,
    });

    // 6. Botão de cópia e mensagem de feedback
    const hasCopyButton = content.includes('Copiar relatório') || content.includes('copyToClipboard');
    const hasExactFeedback = content.includes('Relatório copiado. Envie-o ao suporte da Prexyon.');
    results.push({
      suiteName,
      testName: 'Botão "Copiar relatório" com feedback "Relatório copiado. Envie-o ao suporte da Prexyon."',
      passed: hasCopyButton && hasExactFeedback,
      error: (!hasCopyButton || !hasExactFeedback) ? 'Feedback ou botão de cópia ausente' : undefined,
    });

    // 7. Ausência de backend/API fictícia
    const hasFakeApi = /fetch\s*\(\s*['"`]\/api\/tickets/i.test(content) ||
                       /axios\.(post|get)\s*\(\s*['"`]\/api/i.test(content) ||
                       /supabase\.from\(['"`]tickets['"`]\)/i.test(content) ||
                       content.includes('ticket enviado') ||
                       content.includes('ticket criado');
    results.push({
      suiteName,
      testName: 'Zero APIs/backends fictícios ou simulação de envio de tickets',
      passed: !hasFakeApi,
      error: hasFakeApi ? 'Encontrada chamada de API fictícia ou simulação de envio' : undefined,
    });

    // 8. Ausência de dados sensíveis no relatório
    const hasSensitiveData = content.includes('${jwt') ||
                             content.includes('${token') ||
                             content.includes('${access_token') ||
                             content.includes('${session') ||
                             content.includes('localStorage.get') ||
                             content.includes('sessionStorage.get');
    results.push({
      suiteName,
      testName: 'Relatório não inclui dados sensíveis, tokens, secrets ou dumps de storage',
      passed: !hasSensitiveData,
      error: hasSensitiveData ? 'Inclusão de variáveis de autenticação ou storage no relatório' : undefined,
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
