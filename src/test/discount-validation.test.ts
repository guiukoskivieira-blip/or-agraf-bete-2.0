/**
 * @file discount-validation.test.ts
 * @description Testes direcionados para validação condicional e regras de desconto no formulário de orçamento
 * @project OrçaGraf - Hotfix Desconto Opcional
 */

import { calculateQuoteDiscount, calculateQuoteTotals } from '../domain/quote-calculator';
import { QuoteDiscountType } from '../types/quote';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: string;
}

/**
 * Função modelo representando a lógica do formulário de desconto em NewQuotePage
 */
export function evaluateDiscountFormState(
  discountType: QuoteDiscountType,
  discountValueStr: string,
  subtotalCents: number
) {
  const isInputRendered = discountType !== 'none';
  const isInputRequired = discountType === 'percentage' || discountType === 'fixed';

  let isValidForSubmit = true;
  let validationError: string | null = null;
  let appliedDiscountCents = 0;
  let previewTotalCents = subtotalCents;

  if (discountType === 'none') {
    appliedDiscountCents = 0;
    previewTotalCents = subtotalCents;
    isValidForSubmit = true;
  } else if (discountType === 'percentage') {
    if (!discountValueStr || discountValueStr.trim() === '') {
      isValidForSubmit = false;
      validationError = 'Porcentagem de desconto obrigatória quando tipo for percentual.';
    } else {
      const percent = parseFloat(discountValueStr.replace(',', '.'));
      if (isNaN(percent) || percent <= 0) {
        isValidForSubmit = false;
        validationError = 'Informe uma porcentagem de desconto válida e maior que zero.';
      } else if (percent > 100) {
        isValidForSubmit = false;
        validationError = 'A porcentagem de desconto não pode ultrapassar 100%.';
      } else {
        const res = calculateQuoteDiscount(subtotalCents, 'percentage', percent);
        appliedDiscountCents = res.appliedAmountCents;
        previewTotalCents = res.totalFinalCents;
      }
    }
  } else if (discountType === 'fixed') {
    if (!discountValueStr || discountValueStr.trim() === '') {
      isValidForSubmit = false;
      validationError = 'Valor de desconto obrigatório quando tipo for valor fixo.';
    } else {
      const fixedCents = Math.round((parseFloat(discountValueStr.replace(',', '.')) || 0) * 100);
      if (fixedCents <= 0) {
        isValidForSubmit = false;
        validationError = 'Informe um valor de desconto válido e maior que zero.';
      } else if (fixedCents > subtotalCents) {
        isValidForSubmit = false;
        validationError = 'O desconto não pode ser superior ao subtotal da proposta.';
      } else {
        const res = calculateQuoteDiscount(subtotalCents, 'fixed', fixedCents);
        appliedDiscountCents = res.appliedAmountCents;
        previewTotalCents = res.totalFinalCents;
      }
    }
  }

  return {
    isInputRendered,
    isInputRequired,
    isValidForSubmit,
    validationError,
    appliedDiscountCents,
    previewTotalCents,
  };
}

export function runDiscountValidationTests(): TestResult[] {
  const results: TestResult[] = [];
  const suiteName = 'Validação Condicional de Desconto no Formulário (Hotfix)';

  const record = (testName: string, fn: () => void) => {
    try {
      fn();
      results.push({ suiteName, testName, passed: true });
    } catch (err: any) {
      results.push({ suiteName, testName, passed: false, error: err.message || String(err) });
    }
  };

  const subtotal = 10000; // R$ 100,00

  // 1. Sem Desconto + percentual vazio → submit permitido
  record('1. Sem Desconto + percentual vazio → submit permitido e input não renderizado', () => {
    const state = evaluateDiscountFormState('none', '', subtotal);
    if (!state.isValidForSubmit) {
      throw new Error(`Esperava submit permitido, mas falhou: ${state.validationError}`);
    }
    if (state.isInputRendered) {
      throw new Error('Input de desconto não deveria ser renderizado quando tipo for none');
    }
    if (state.isInputRequired) {
      throw new Error('Input não deve ser obrigatório quando tipo for none');
    }
  });

  // 2. Sem Desconto + valor fixo vazio → submit permitido
  record('2. Sem Desconto + valor fixo vazio → submit permitido e sem desconto aplicado', () => {
    const state = evaluateDiscountFormState('none', '', subtotal);
    if (!state.isValidForSubmit) {
      throw new Error('Submit deveria ser permitido para Sem Desconto');
    }
    if (state.appliedDiscountCents !== 0) {
      throw new Error(`Desconto aplicado deveria ser 0, obtido: ${state.appliedDiscountCents}`);
    }
    if (state.previewTotalCents !== subtotal) {
      throw new Error(`Total deveria ser igual ao subtotal (${subtotal}), obtido: ${state.previewTotalCents}`);
    }
  });

  // 3. Percentual selecionado + percentual vazio → bloqueia
  record('3. Percentual selecionado + percentual vazio → bloqueia validação nativa e formulário', () => {
    const state = evaluateDiscountFormState('percentage', '', subtotal);
    if (state.isValidForSubmit) {
      throw new Error('Deveria ter bloqueado quando percentual está vazio');
    }
    if (!state.isInputRendered || !state.isInputRequired) {
      throw new Error('Input percentual deve estar renderizado e com required=true');
    }
  });

  // 4. Percentual válido → permite
  record('4. Percentual válido → calcula corretamente e permite submit', () => {
    const state = evaluateDiscountFormState('percentage', '10', subtotal);
    if (!state.isValidForSubmit) {
      throw new Error(`Deveria permitir percentual válido: ${state.validationError}`);
    }
    if (state.appliedDiscountCents !== 1000) {
      throw new Error(`Desconto esperado 1000 centavos (10%), obtido: ${state.appliedDiscountCents}`);
    }
    if (state.previewTotalCents !== 9000) {
      throw new Error(`Total esperado 9000 centavos, obtido: ${state.previewTotalCents}`);
    }
  });

  // 5. Valor fixo selecionado + valor vazio → bloqueia
  record('5. Valor fixo selecionado + valor vazio → bloqueia validação nativa e formulário', () => {
    const state = evaluateDiscountFormState('fixed', '', subtotal);
    if (state.isValidForSubmit) {
      throw new Error('Deveria ter bloqueado quando valor fixo está vazio');
    }
    if (!state.isInputRendered || !state.isInputRequired) {
      throw new Error('Input de valor fixo deve estar renderizado e com required=true');
    }
  });

  // 6. Valor fixo válido → permite
  record('6. Valor fixo válido → calcula desconto e permite submit', () => {
    const state = evaluateDiscountFormState('fixed', '25,00', subtotal);
    if (!state.isValidForSubmit) {
      throw new Error(`Deveria permitir valor fixo válido: ${state.validationError}`);
    }
    if (state.appliedDiscountCents !== 2500) {
      throw new Error(`Desconto esperado 2500 centavos, obtido: ${state.appliedDiscountCents}`);
    }
    if (state.previewTotalCents !== 7500) {
      throw new Error(`Total esperado 7500 centavos, obtido: ${state.previewTotalCents}`);
    }
  });

  // 7. Trocar de percentual para Sem Desconto remove bloqueio residual
  record('7. Trocar de percentual para Sem Desconto reseta input e remove bloqueio residual', () => {
    // 1o estado: usuário selecionou percentual e deixou vazio
    const invalidState = evaluateDiscountFormState('percentage', '', subtotal);
    if (invalidState.isValidForSubmit) {
      throw new Error('Deveria ser inválido enquanto percentual vazio');
    }

    // 2o estado: usuário troca para 'none', limpando o valor em digitação
    const resetValue = '';
    const validState = evaluateDiscountFormState('none', resetValue, subtotal);
    if (!validState.isValidForSubmit) {
      throw new Error('Após trocar para none, submit deve ser imediatamente liberado');
    }
    if (validState.isInputRendered) {
      throw new Error('Input não deve permanecer no DOM após troca para none');
    }
  });

  // 8. Desconto zero não altera total
  record('8. Desconto zero normalizado não altera o total da proposta', () => {
    const totalsNone = calculateQuoteTotals(subtotal, { type: 'none', value: 0, appliedAmountCents: 0 });
    if (totalsNone.appliedAmountCents !== 0 || totalsNone.totalFinalCents !== subtotal) {
      throw new Error(`calculateQuoteTotals alterou o total para desconto none: ${JSON.stringify(totalsNone)}`);
    }

    const totalsZeroPercent = calculateQuoteDiscount(subtotal, 'percentage', 0);
    if (totalsZeroPercent.appliedAmountCents !== 0 || totalsZeroPercent.totalFinalCents !== subtotal) {
      throw new Error(`calculateQuoteDiscount com 0% alterou o total: ${JSON.stringify(totalsZeroPercent)}`);
    }
  });

  return results;
}
