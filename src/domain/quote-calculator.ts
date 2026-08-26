/**
 * @file quote-calculator.ts
 * @description Lógica de Domínio para Descontos Globais, Totais de Orçamento e Parcelamento com Centavos Exatos
 * @project OrçaGraf
 * 
 * REGRAS OBRIGATÓRIAS:
 * 1. Todos os cálculos monetários em centavos inteiros (BRL).
 * 2. Nunca permitir desconto negativo nem superior ao subtotal.
 * 3. Arredondamento correto de porcentagem: Math.round((subtotal * percent) / 100).
 * 4. Preservação do subtotal original: TOTAL FINAL = Math.max(0, SUBTOTAL - DESCONTO).
 * 5. Na divisão de parcelas com dízima/centavos inexatos, o resto é distribuído nas primeiras parcelas,
 *    garantindo que a SOMA DAS PARCELAS SEJA ESTRITAMENTE IGUAL AO TOTAL FINAL.
 */

import {
  QuoteDiscount,
  QuoteDiscountType,
  PaymentMethod,
  PaymentCondition,
  QuoteInstallmentPlan,
} from '../types/quote';

export interface DiscountCalculationResult {
  appliedAmountCents: number;
  totalFinalCents: number;
}

/**
 * Calcula o desconto do orçamento respeitando todas as regras de segurança e precisão
 */
export function calculateQuoteDiscount(
  subtotalCents: number,
  type: QuoteDiscountType,
  value: number
): DiscountCalculationResult {
  const safeSubtotal = Math.max(0, Math.round(subtotalCents || 0));

  if (safeSubtotal === 0 || type === 'none') {
    return {
      appliedAmountCents: 0,
      totalFinalCents: safeSubtotal,
    };
  }

  // Previne valores negativos
  const safeValue = Math.max(0, Number(value) || 0);

  let appliedAmount = 0;

  if (type === 'percentage') {
    const safePercent = Math.min(100, safeValue);
    appliedAmount = Math.round((safeSubtotal * safePercent) / 100);
  } else if (type === 'fixed') {
    // Valor fixo já em centavos
    appliedAmount = Math.round(safeValue);
  }

  // O desconto nunca pode ultrapassar o subtotal
  const appliedDiscountCents = Math.min(safeSubtotal, appliedAmount);
  const totalFinalCents = Math.max(0, safeSubtotal - appliedDiscountCents);

  return {
    appliedAmountCents: appliedDiscountCents,
    totalFinalCents,
  };
}

/**
 * Calcula os totais do orçamento a partir do subtotal e objeto QuoteDiscount
 */
export function calculateQuoteTotals(
  subtotalCents: number,
  discount?: QuoteDiscount
): DiscountCalculationResult {
  if (!discount || discount.type === 'none') {
    return {
      appliedAmountCents: 0,
      totalFinalCents: Math.max(0, Math.round(subtotalCents || 0)),
    };
  }

  return calculateQuoteDiscount(subtotalCents, discount.type, discount.value);
}

/**
 * Calcula o plano de parcelamento garantindo que a soma exata dos centavos bata com o total
 */
export function calculateInstallments(
  totalCents: number,
  condition: PaymentCondition,
  installmentsCount: number = 1,
  downPaymentCents: number = 0,
  intervalDays: number = 30,
  startDateStr?: string
): QuoteInstallmentPlan[] {
  const safeTotal = Math.max(0, Math.round(totalCents || 0));
  const baseDate = startDateStr ? new Date(startDateStr) : new Date();

  if (safeTotal === 0) {
    return [
      {
        installmentNumber: 1,
        dueDate: baseDate.toISOString().split('T')[0],
        amountCents: 0,
      },
    ];
  }

  // À vista ou indefinido
  if (condition === 'in_cash' || condition === 'to_be_defined' || installmentsCount <= 1) {
    return [
      {
        installmentNumber: 1,
        dueDate: baseDate.toISOString().split('T')[0],
        amountCents: safeTotal,
      },
    ];
  }

  const results: QuoteInstallmentPlan[] = [];

  // Entrada + Saldo Parcelado
  if (condition === 'down_payment_and_balance') {
    const safeDownPayment = Math.min(safeTotal, Math.max(0, Math.round(downPaymentCents)));
    const remainingCents = safeTotal - safeDownPayment;

    // Entrada sempre é a parcela 1
    results.push({
      installmentNumber: 1,
      dueDate: baseDate.toISOString().split('T')[0],
      amountCents: safeDownPayment,
    });

    if (remainingCents > 0) {
      const remainingCount = Math.max(1, installmentsCount);
      const baseAmount = Math.floor(remainingCents / remainingCount);
      let remainder = remainingCents % remainingCount;

      for (let i = 1; i <= remainingCount; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + i * intervalDays);

        const installmentAmount = baseAmount + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        results.push({
          installmentNumber: i + 1,
          dueDate: dueDate.toISOString().split('T')[0],
          amountCents: installmentAmount,
        });
      }
    }

    return results;
  }

  // Parcelado sem entrada
  const count = Math.max(1, installmentsCount);
  const baseAmount = Math.floor(safeTotal / count);
  let remainder = safeTotal % count;

  for (let i = 1; i <= count; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + (i - 1) * intervalDays);

    const installmentAmount = baseAmount + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    results.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      amountCents: installmentAmount,
    });
  }

  return results;
}

/**
 * Validação estrita: verifica se a soma exata das parcelas é igual ao valor total em centavos
 */
export function validateInstallmentsSum(
  installments: QuoteInstallmentPlan[],
  expectedTotalCents: number
): boolean {
  const sum = installments.reduce((acc, inst) => acc + (inst.amountCents || 0), 0);
  return sum === expectedTotalCents;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix Instantâneo',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  bank_slip: 'Boleto Bancário',
  cash: 'Dinheiro em Espécie',
  bank_transfer: 'Transferência Bancária',
  to_be_defined: 'A Combinar',
};

export const PAYMENT_CONDITION_LABELS: Record<PaymentCondition, string> = {
  in_cash: 'À Vista',
  installments: 'Parcelado',
  down_payment_and_balance: 'Entrada + Saldo Parcelado',
  to_be_defined: 'A Definir',
};

export { formatCentsToBRL, parseBRLToCents } from './money';
