/**
 * @file accessibility-responsive.test.ts
 * @description Testes automatizados de regressão para Acessibilidade, Responsividade e Modais do OrçaGraf
 * @project OrçaGraf
 */

import fs from 'fs';
import path from 'path';
import { TestResult } from './domain-integrity.test';

export function runAccessibilityResponsiveTests(): TestResult[] {
  const results: TestResult[] = [];
  const suite = 'Acessibilidade, Responsividade e Modais (Hotfix P2/P3)';

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      results.push({ suiteName: suite, testName, passed: true });
    } else {
      results.push({
        suiteName: suite,
        testName,
        passed: false,
        error: errorDetail || 'Falha na asserção de regressão',
      });
    }
  }

  const rootDir = path.resolve(process.cwd(), 'src');

  // 1. Header usa ocultação do perfil abaixo de sm
  try {
    const headerCode = fs.readFileSync(path.join(rootDir, 'components/layout/Header.tsx'), 'utf-8');
    const hasHiddenSmFlex = headerCode.includes('hidden sm:flex items-center gap-2.5');
    const preservesAvatarAria = headerCode.includes('aria-label="Perfil do usuário"');
    assert(
      hasHiddenSmFlex && preservesAvatarAria,
      '1. Header mobile oculta botão/avatar do perfil abaixo de sm (hidden sm:flex) e preserva no desktop'
    );
  } catch (err: any) {
    assert(false, '1. Header mobile oculta botão/avatar do perfil abaixo de sm', err.message);
  }

  // 2. QuoteDetails possui exatamente um h1 com o número do orçamento
  try {
    const quoteDetailsCode = fs.readFileSync(path.join(rootDir, 'pages/QuoteDetailsPage.tsx'), 'utf-8');
    const h1Matches = quoteDetailsCode.match(/<h1[\s\S]*?<\/h1>/g) || [];
    const hasQuoteNumberH1 = h1Matches.some(h1 => h1.includes('{quote.quoteNumber}'));
    const isSingleH1 = h1Matches.length === 1;
    assert(
      isSingleH1 && hasQuoteNumberH1,
      '2. QuoteDetails possui exatamente um <h1> semântico com o número do orçamento (quote.quoteNumber)'
    );
  } catch (err: any) {
    assert(false, '2. QuoteDetails possui exatamente um h1 com o número do orçamento', err.message);
  }

  // 3. Modais de Clientes fecham com Escape
  try {
    const customersCode = fs.readFileSync(path.join(rootDir, 'pages/CustomersPage.tsx'), 'utf-8');
    const handlesEscape = customersCode.includes("e.key === 'Escape'") && customersCode.includes('handleCloseModal');
    const hasRoleDialog = customersCode.includes('role="dialog"') && customersCode.includes('aria-modal="true"');
    assert(
      handlesEscape && hasRoleDialog,
      '3. Modal de Clientes fecha com a tecla Escape e possui atributos acessíveis de diálogo (role="dialog")'
    );
  } catch (err: any) {
    assert(false, '3. Modal de Clientes fecha com a tecla Escape', err.message);
  }

  // 4. Modais do Catálogo fecham com Escape
  try {
    const catalogCode = fs.readFileSync(path.join(rootDir, 'pages/CatalogPage.tsx'), 'utf-8');
    const handlesEscape =
      catalogCode.includes("e.key === 'Escape'") &&
      catalogCode.includes('handleCloseFinishingModal') &&
      catalogCode.includes('handleCloseMaterialModal') &&
      catalogCode.includes('handleCloseProductModal');
    const dialogCount = (catalogCode.match(/role="dialog"/g) || []).length;
    assert(
      handlesEscape && dialogCount >= 3,
      '4. Modais do Catálogo (Produto, Insumo e Acabamento) fecham com a tecla Escape e tratam modal ativo'
    );
  } catch (err: any) {
    assert(false, '4. Modais do Catálogo fecham com a tecla Escape', err.message);
  }

  // 5. Modais do Novo Orçamento fecham com Escape
  try {
    const newQuoteCode = fs.readFileSync(path.join(rootDir, 'pages/NewQuotePage.tsx'), 'utf-8');
    const handlesEscape =
      newQuoteCode.includes("e.key === 'Escape'") &&
      newQuoteCode.includes('handleCloseRemoveDiscountModal') &&
      newQuoteCode.includes('handleCloseCatalogPicker');
    assert(
      handlesEscape,
      '5. Modais do Novo Orçamento (Seletor de Catálogo e Remoção de Desconto) fecham com a tecla Escape'
    );
  } catch (err: any) {
    assert(false, '5. Modais do Novo Orçamento fecham com a tecla Escape', err.message);
  }

  // 6. Modais de aprovação e WhatsApp fecham com Escape
  try {
    const quoteDetailsCode = fs.readFileSync(path.join(rootDir, 'pages/QuoteDetailsPage.tsx'), 'utf-8');
    const quotesCode = fs.readFileSync(path.join(rootDir, 'pages/QuotesPage.tsx'), 'utf-8');
    const generalCode = fs.readFileSync(path.join(rootDir, 'pages/GeneralPage.tsx'), 'utf-8');

    const quoteDetailsEscape =
      quoteDetailsCode.includes("e.key === 'Escape'") &&
      quoteDetailsCode.includes('handleCloseConfirmApproveModal') &&
      quoteDetailsCode.includes('handleCloseWpModal');
    const quotesEscape = quotesCode.includes("e.key === 'Escape'") && quotesCode.includes('handleCloseWhatsAppModal');
    const generalEscape = generalCode.includes("e.key === 'Escape'") && generalCode.includes('handleCloseApproveModal');

    assert(
      quoteDetailsEscape && quotesEscape && generalEscape,
      '6. Modais de Aprovação Comercial e WhatsApp (em Geral, Orçamentos e Detalhes) fecham com a tecla Escape'
    );
  } catch (err: any) {
    assert(false, '6. Modais de aprovação e WhatsApp fecham com Escape', err.message);
  }

  // 7. Listeners de keydown possuem cleanup
  try {
    const filesToCheck = [
      'pages/CustomersPage.tsx',
      'pages/CatalogPage.tsx',
      'pages/NewQuotePage.tsx',
      'pages/QuoteDetailsPage.tsx',
      'pages/QuotesPage.tsx',
      'pages/GeneralPage.tsx',
      'components/common/QuickSearchModal.tsx',
      'components/layout/MobileNav.tsx',
    ];

    const allHaveCleanup = filesToCheck.every(relPath => {
      const code = fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
      return code.includes('addEventListener') && code.includes('removeEventListener');
    });

    assert(
      allHaveCleanup,
      '7. Todos os componentes com listeners de teclado (keydown) removem os eventos no cleanup do useEffect'
    );
  } catch (err: any) {
    assert(false, '7. Listeners de keydown possuem cleanup', err.message);
  }

  // 8. O foco retorna ao acionador após fechar
  try {
    const customersCode = fs.readFileSync(path.join(rootDir, 'pages/CustomersPage.tsx'), 'utf-8');
    const catalogCode = fs.readFileSync(path.join(rootDir, 'pages/CatalogPage.tsx'), 'utf-8');
    const quoteDetailsCode = fs.readFileSync(path.join(rootDir, 'pages/QuoteDetailsPage.tsx'), 'utf-8');
    const quotesCode = fs.readFileSync(path.join(rootDir, 'pages/QuotesPage.tsx'), 'utf-8');
    const generalCode = fs.readFileSync(path.join(rootDir, 'pages/GeneralPage.tsx'), 'utf-8');

    const allHaveTriggerRef =
      customersCode.includes('triggerRef.current?.focus()') &&
      catalogCode.includes('triggerRef.current?.focus()') &&
      quoteDetailsCode.includes('triggerRef.current?.focus()') &&
      quotesCode.includes('triggerRef.current?.focus()') &&
      generalCode.includes('triggerRef.current?.focus()');

    assert(
      allHaveTriggerRef,
      '8. O foco é devolvido com precisão ao elemento acionador original (triggerRef.current?.focus()) ao fechar modais'
    );
  } catch (err: any) {
    assert(false, '8. O foco retorna ao acionador após fechar', err.message);
  }

  // 9. Button size="sm" mantém área mínima de 36 × 36 px
  try {
    const buttonCode = fs.readFileSync(path.join(rootDir, 'components/ui/Button.tsx'), 'utf-8');
    const hasMinTouchTarget = buttonCode.includes("sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[36px] min-w-[36px]'");
    assert(
      hasMinTouchTarget,
      '9. Botão size="sm" estabelece área de toque mínima de 36 × 36 px (min-h-[36px] min-w-[36px])'
    );
  } catch (err: any) {
    assert(false, '9. Button size="sm" mantém área mínima de 36 × 36 px', err.message);
  }

  // 10. As tabelas mantêm overflow horizontal interno
  try {
    const catalogCode = fs.readFileSync(path.join(rootDir, 'pages/CatalogPage.tsx'), 'utf-8');
    const quotesCode = fs.readFileSync(path.join(rootDir, 'pages/QuotesPage.tsx'), 'utf-8');
    const customersCode = fs.readFileSync(path.join(rootDir, 'pages/CustomersPage.tsx'), 'utf-8');

    const catalogHasOverflow = (catalogCode.match(/overflow-x-auto/g) || []).length >= 3;
    const quotesHasOverflow = quotesCode.includes('overflow-x-auto');
    const customersHasOverflow = customersCode.includes('overflow-x-auto');

    assert(
      catalogHasOverflow && quotesHasOverflow && customersHasOverflow,
      '10. As tabelas de Produtos, Insumos, Acabamentos, Orçamentos e Clientes preservam container com overflow-x-auto'
    );
  } catch (err: any) {
    assert(false, '10. As tabelas mantêm overflow horizontal interno', err.message);
  }

  return results;
}