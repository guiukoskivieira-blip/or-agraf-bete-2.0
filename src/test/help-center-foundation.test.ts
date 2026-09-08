/**
 * @file help-center-foundation.test.ts
 * @description Testes direcionados para a fundação da Central de Ajuda (Etapa 1)
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export function runHelpCenterFoundationTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Central de Ajuda — Fundação (Etapa 1)';

  // 1. Rota própria e página base
  try {
    const helpPagePath = path.resolve(__dirname, '../pages/HelpCenterPage.tsx');
    const helpPageContent = fs.readFileSync(helpPagePath, 'utf-8');

    const hasTitle = helpPageContent.includes('Central de Ajuda');
    const hasSubtitle = helpPageContent.includes('Encontre orientações rápidas ou prepare um relatório para o suporte.');

    results.push({
      suiteName,
      testName: 'HelpCenterPage.tsx existe e contém título e subtítulo oficiais',
      passed: hasTitle && hasSubtitle,
      error: (!hasTitle || !hasSubtitle) ? 'Título ou subtítulo oficial ausente' : undefined,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'HelpCenterPage.tsx existe',
      passed: false,
      error: err.message,
    });
  }

  // 2. Sidebar navega para 'help'
  try {
    const sidebarPath = path.resolve(__dirname, '../components/layout/Sidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

    const routesToHelp = sidebarContent.includes("onSelectTab('help')");
    const activeTabSupportsHelp = sidebarContent.includes("activeTab === 'help'");

    results.push({
      suiteName,
      testName: 'Sidebar direciona "Central de ajuda" para a rota própria "help"',
      passed: routesToHelp && activeTabSupportsHelp,
      error: (!routesToHelp || !activeTabSupportsHelp) ? 'Sidebar não configurada com rota help' : undefined,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'Sidebar.tsx configuração',
      passed: false,
      error: err.message,
    });
  }

  // 3. MobileNav navega para 'help'
  try {
    const mobileNavPath = path.resolve(__dirname, '../components/layout/MobileNav.tsx');
    const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf-8');

    const mobileRoutesToHelp = mobileNavContent.includes("onSelectTab('help')");

    results.push({
      suiteName,
      testName: 'MobileNav direciona "Central de ajuda" para a rota própria "help"',
      passed: mobileRoutesToHelp,
      error: !mobileRoutesToHelp ? 'MobileNav não configurado com rota help' : undefined,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'MobileNav.tsx configuração',
      passed: false,
      error: err.message,
    });
  }

  // 4. App.tsx roteia 'help' diretamente para HelpCenterPage (sem Perfil)
  try {
    const appPath = path.resolve(__dirname, '../App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    const parsesHelp = appContent.includes("primary === 'help'");
    const rendersHelpPage = appContent.includes("case 'help':") && appContent.includes("<HelpCenterPage");
    const profileNotHelpFallback = !appContent.includes("case 'help':\n        return <MyProfilePage");

    results.push({
      suiteName,
      testName: 'App.tsx reconhece e renderiza rota própria "help" para HelpCenterPage (Perfil não usado como Help)',
      passed: parsesHelp && rendersHelpPage && profileNotHelpFallback,
      error: (!parsesHelp || !rendersHelpPage || !profileNotHelpFallback) ? 'Roteamento de help inválido no App.tsx' : undefined,
    });
  } catch (err: any) {
    results.push({
      suiteName,
      testName: 'App.tsx configuração',
      passed: false,
      error: err.message,
    });
  }

  return results;
}
