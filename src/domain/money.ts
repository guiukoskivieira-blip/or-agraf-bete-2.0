/**
 * @file money.ts
 * @description Funções utilitárias de alta precisão para manipulação monetária em centavos inteiros (BRL)
 * @project OrçaGraf - Etapa 1 Fundação
 * 
 * Regra: Todos os cálculos de preços, totais, descontos e impostos usam inteiros (centavos)
 * para evitar imprecisões do ponto flutuante IEEE 754 em navegadores e servidores.
 */

/**
 * Formata um valor em centavos para a moeda brasileira (ex: 1550 -> "R$ 15,50")
 */
export function formatCentsToBRL(cents: number): string {
  if (isNaN(cents) || cents === null || cents === undefined) {
    return 'R$ 0,00';
  }
  const value = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte valor decimal em string ou float digitado pelo usuário para centavos inteiros
 * Ex: "15,50" ou "15.50" -> 1550
 */
export function parseBRLToCents(val: string | number): number {
  if (typeof val === 'number') {
    return Math.round(val * 100);
  }
  if (!val || typeof val !== 'string') {
    return 0;
  }
  // Limpa caracteres de moeda e formatação brasileira
  const cleanStr = val
    .replace(/[^\d,-]/g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/**
 * Soma valores em centavos com segurança
 */
export function sumCents(...values: number[]): number {
  return values.reduce((acc, curr) => acc + (Math.round(curr) || 0), 0);
}

/**
 * Calcula desconto em percentual sobre centavos
 */
export function applyPercentageDiscount(totalCents: number, discountPercent: number): number {
  if (discountPercent <= 0) return totalCents;
  if (discountPercent >= 100) return 0;
  const discountAmount = Math.round((totalCents * discountPercent) / 100);
  return Math.max(0, totalCents - discountAmount);
}

/**
 * Normaliza qualquer padrão monetário residual em textos (ex: "R$ 72.00" -> "R$ 72,00", "R$ 1234.56" -> "R$ 1.234,56")
 */
export function normalizeMonetaryText(text: string): string {
  if (!text) return '';
  return text.replace(/R\$\s?(\d+)\.(\d{2})\b/g, (_match, intPart, decPart) => {
    const formattedInt = Number(intPart).toLocaleString('pt-BR');
    return `R$ ${formattedInt},${decPart}`;
  });
}

