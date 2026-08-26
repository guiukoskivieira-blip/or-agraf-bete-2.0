/**
 * @file pricing-engine.ts
 * @description Motor Centralizado e Determinístico de Precificação de Produtos Gráficos e Acabamentos
 * @project OrçaGraf
 * 
 * 4 MODALIDADES DE PREÇO:
 * 1. UNIT          - Por Unidade: totalBase = quantidade × preçoPorUnidade
 * 2. LOT           - Por Lote/Tiragem: quantidadeDeLotes = teto(quantidadeSolicitada ÷ tamanhoDoLote)
 *                                      totalBase = quantidadeDeLotes × preçoPorLote
 * 3. SQUARE_METER  - Por Metro Quadrado: áreaTotal = (largura_m × altura_m) × quantidade
 *                                        totalBase = áreaTotal × preçoPorM2
 * 4. LINEAR_METER  - Por Metro Linear: comprimentoTotal = comprimento_m × quantidade
 *                                      totalBase = comprimentoTotal × preçoPorMetroLinear
 * 
 * REGRAS MONETÁRIAS:
 * - Todos os valores monetários calculados e retornados em centavos inteiros (BRL).
 * - Sem erros de ponto flutuante em somas financeiras.
 * - Arredondamento seguro com Math.round() apenas nos limites do cálculo.
 */

import { PricingMode, FinishingPricingBasis } from '../types/product';
import { QuoteItemFinishing } from '../types/quote';
import { formatCentsToBRL } from './money';

export interface ItemPricingInput {
  pricingMode: PricingMode;
  salePriceCents: number; // Preço base cadastrado para a modalidade
  quantity: number; // Quantidade solicitada (unidades ou peças)
  lotSize?: number; // Tamanho do lote de tiragem (quando LOT, ex: 1000)
  widthMm?: number; // Largura em mm (quando SQUARE_METER ou LINEAR_METER)
  heightMm?: number; // Altura em mm (quando SQUARE_METER)
  lengthMeters?: number; // Comprimento em metros (quando LINEAR_METER)
  minSalePriceCents?: number; // Preço mínimo configurado
  finishings?: {
    finishingId: string;
    name: string;
    pricingBasis?: FinishingPricingBasis | string;
    unitPriceCents: number;
    isRequired?: boolean;
    isOptional?: boolean;
    notes?: string;
  }[];
}

export interface CalculatedFinishingItem extends QuoteItemFinishing {
  pricingBasis: FinishingPricingBasis;
  calculatedUnits: number;
}

export interface ItemPricingResult {
  pricingMode: PricingMode;
  requestedQuantity: number;
  lotSize?: number;
  billedQuantity: number; // Quantidade faturada (lotes, m², m linear ou un)
  
  // Dimensões normalizadas
  widthMm?: number;
  heightMm?: number;
  areaM2?: number; // Área total calculada em m²
  linearMeters?: number; // Comprimento total calculado em metros lineares
  
  // Valores monetários em centavos
  basePriceCents: number; // Preço unitário/base cadastrado
  baseTotalCents: number; // Total base antes de acabamentos
  finishingsTotalCents: number; // Soma de todos os acabamentos
  totalItemCents: number; // Total final do item (base + acabamentos)
  unitPriceEquivalentCents: number; // Preço unitário aparente (total ÷ quantidade solicitada)
  
  // Acabamentos calculados
  calculatedFinishings: CalculatedFinishingItem[];
  
  // Apresentação e validação
  pricingSummary: string; // Resumo textual (ex: "1.000 unidades • 1 lote de 1.000 × R$ 70,00 = R$ 70,00")
  isValid: boolean;
  validationError?: string;
}

/**
 * Validação de número positivo e finito
 */
function isValidPositive(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val) && isFinite(val) && val > 0;
}

function formatThousands(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

/**
 * Função Pura Central de Cálculo de Preço do Item Gráfico
 */
export function calculateItemPricing(input: ItemPricingInput): ItemPricingResult {
  const {
    pricingMode = 'UNIT',
    salePriceCents = 0,
    quantity = 1,
    lotSize = 1000,
    widthMm,
    heightMm,
    lengthMeters,
    minSalePriceCents = 0,
    finishings = [],
  } = input;

  let validationError: string | undefined;

  // Validações estritas de domínio
  if (typeof quantity === 'number' && (isNaN(quantity) || !isFinite(quantity) || quantity <= 0)) {
    validationError = 'A quantidade solicitada deve ser um número positivo maior que zero.';
  }
  if (typeof salePriceCents === 'number' && (isNaN(salePriceCents) || !isFinite(salePriceCents) || salePriceCents < 0)) {
    validationError = 'O preço deve ser um valor numérico válido e não-negativo.';
  }
  if (pricingMode === 'LOT') {
    if (lotSize !== undefined && (typeof lotSize !== 'number' || isNaN(lotSize) || !isFinite(lotSize) || lotSize <= 0)) {
      validationError = 'O tamanho do lote deve ser maior que zero.';
    }
  }
  if (pricingMode === 'SQUARE_METER') {
    if (widthMm !== undefined && (isNaN(widthMm) || widthMm <= 0)) {
      validationError = 'A largura deve ser maior que zero para cálculo por m².';
    }
    if (heightMm !== undefined && (isNaN(heightMm) || heightMm <= 0)) {
      validationError = 'A altura deve ser maior que zero para cálculo por m².';
    }
  }
  if (pricingMode === 'LINEAR_METER') {
    const len = lengthMeters !== undefined ? lengthMeters : (widthMm ? widthMm / 1000 : 1);
    if (isNaN(len) || len <= 0) {
      validationError = 'O comprimento deve ser maior que zero para cálculo por metro linear.';
    }
  }

  const safeSalePrice = Math.max(0, Math.round(Number(salePriceCents) || 0));
  const safeQuantity = Math.max(1, Math.round(Number(quantity) || 1));
  const safeMinPrice = Math.max(0, Math.round(Number(minSalePriceCents) || 0));

  let billedQuantity = safeQuantity;
  let baseTotalCents = 0;
  let areaM2: number | undefined;
  let linearMeters: number | undefined;
  let pricingSummary = '';

  // 1. UNIDADE (UNIT)
  if (pricingMode === 'UNIT') {
    billedQuantity = safeQuantity;
    baseTotalCents = billedQuantity * safeSalePrice;
    pricingSummary = `${formatThousands(safeQuantity)} un. × ${formatCentsToBRL(safeSalePrice)} = ${formatCentsToBRL(baseTotalCents)}`;
  }
  // 2. LOTE / TIRAGEM (LOT)
  else if (pricingMode === 'LOT') {
    const safeLotSize = isValidPositive(lotSize) ? Math.round(lotSize) : 1000;

    // Fórmula: teto(quantidadeSolicitada ÷ tamanhoDoLote)
    const billedLots = Math.max(1, Math.ceil(safeQuantity / safeLotSize));
    billedQuantity = billedLots;
    baseTotalCents = billedLots * safeSalePrice;

    pricingSummary = `${formatThousands(safeQuantity)} unidades • ${billedLots} lote(s) de ${formatThousands(safeLotSize)} × ${formatCentsToBRL(safeSalePrice)} = ${formatCentsToBRL(baseTotalCents)}`;
  }
  // 3. METRO QUADRADO (SQUARE_METER)
  else if (pricingMode === 'SQUARE_METER') {
    const widthM = widthMm ? widthMm / 1000 : 1;
    const heightM = heightMm ? heightMm / 1000 : 1;

    if (widthM <= 0 || heightM <= 0) {
      validationError = 'Largura e altura devem ser maiores que zero para cálculo por m².';
    }

    const areaPerPieceM2 = widthM * heightM;
    const totalAreaM2 = areaPerPieceM2 * safeQuantity;
    areaM2 = totalAreaM2;
    billedQuantity = totalAreaM2;

    // Arredondamento seguro em centavos
    baseTotalCents = Math.round(totalAreaM2 * safeSalePrice);
    pricingSummary = `${safeQuantity} pç(s) ${widthM.toFixed(2)}×${heightM.toFixed(2)}m (${totalAreaM2.toFixed(2)} m²) × ${formatCentsToBRL(safeSalePrice)}/m² = ${formatCentsToBRL(baseTotalCents)}`;
  }
  // 4. METRO LINEAR (LINEAR_METER)
  else if (pricingMode === 'LINEAR_METER') {
    let pieceLengthM = lengthMeters;
    if (!pieceLengthM && widthMm) {
      pieceLengthM = widthMm / 1000;
    }
    pieceLengthM = pieceLengthM || 1;

    if (pieceLengthM <= 0) {
      validationError = 'O comprimento deve ser maior que zero para cálculo por metro linear.';
    }

    const totalLinearM = pieceLengthM * safeQuantity;
    linearMeters = totalLinearM;
    billedQuantity = totalLinearM;

    // Arredondamento seguro em centavos
    baseTotalCents = Math.round(totalLinearM * safeSalePrice);
    pricingSummary = `${safeQuantity} pç(s) de ${pieceLengthM.toFixed(2)}m (${totalLinearM.toFixed(2)} m linear) × ${formatCentsToBRL(safeSalePrice)}/m = ${formatCentsToBRL(baseTotalCents)}`;
  }

  // 5. CÁLCULO DE ACABAMENTOS
  const calculatedFinishings: CalculatedFinishingItem[] = [];
  let finishingsTotalCents = 0;

  for (const fin of finishings) {
    const finUnitPrice = Math.max(0, Math.round(Number(fin.unitPriceCents) || 0));
    let basis: FinishingPricingBasis = 'unit';

    // Inferência ou leitura da base de cobrança do acabamento
    if (fin.pricingBasis === 'fixed') {
      basis = 'fixed';
    } else if (fin.pricingBasis === 'lot' || (pricingMode === 'LOT' && (fin.pricingBasis === 'mil' || fin.pricingBasis === 'unit'))) {
      basis = 'lot';
    } else if (fin.pricingBasis === 'area_m2' || fin.pricingBasis === 'm2') {
      basis = 'area_m2';
    } else if (fin.pricingBasis === 'linear_meter') {
      basis = 'linear_meter';
    } else {
      // Fallback conforme a modalidade do produto pai
      if (pricingMode === 'SQUARE_METER' && fin.pricingBasis === 'area_m2') {
        basis = 'area_m2';
      } else if (pricingMode === 'LINEAR_METER' && fin.pricingBasis === 'linear_meter') {
        basis = 'linear_meter';
      } else if (pricingMode === 'LOT') {
        basis = 'lot';
      } else {
        basis = 'unit';
      }
    }

    let finTotalCents = 0;
    let finUnits = 1;

    if (basis === 'fixed') {
      finUnits = 1;
      finTotalCents = finUnitPrice;
    } else if (basis === 'lot') {
      const billedLots = pricingMode === 'LOT' ? Math.max(1, Math.ceil(safeQuantity / (lotSize || 1000))) : 1;
      finUnits = billedLots;
      finTotalCents = billedLots * finUnitPrice;
    } else if (basis === 'area_m2') {
      const area = areaM2 || (safeQuantity * 1);
      finUnits = area;
      finTotalCents = Math.round(area * finUnitPrice);
    } else if (basis === 'linear_meter') {
      const length = linearMeters || (safeQuantity * 1);
      finUnits = length;
      finTotalCents = Math.round(length * finUnitPrice);
    } else {
      // unit
      finUnits = safeQuantity;
      finTotalCents = safeQuantity * finUnitPrice;
    }

    finishingsTotalCents += finTotalCents;

    calculatedFinishings.push({
      finishingId: fin.finishingId,
      name: fin.name,
      pricingBasis: basis,
      calculatedUnits: finUnits,
      unitPriceCents: finUnitPrice,
      totalPriceCents: finTotalCents,
      isRequired: fin.isRequired,
      isOptional: fin.isOptional,
      notes: fin.notes,
    });
  }

  // Total do item = Base + Acabamentos (respeitando preço mínimo se aplicável)
  const rawItemTotalCents = baseTotalCents + finishingsTotalCents;
  const totalItemCents = Math.max(safeMinPrice, rawItemTotalCents);

  const unitPriceEquivalentCents = Math.round(totalItemCents / safeQuantity);

  return {
    pricingMode,
    requestedQuantity: safeQuantity,
    lotSize: pricingMode === 'LOT' ? (lotSize || 1000) : undefined,
    billedQuantity,
    widthMm,
    heightMm,
    areaM2,
    linearMeters,
    basePriceCents: safeSalePrice,
    baseTotalCents,
    finishingsTotalCents,
    totalItemCents,
    unitPriceEquivalentCents,
    calculatedFinishings,
    pricingSummary,
    isValid: !validationError,
    validationError,
  };
}

/**
 * Normaliza e infere a modalidade de preço para itens e produtos legados
 */
export function inferPricingMode(productOrItem: {
  pricingMode?: PricingMode;
  calculationUnit?: string;
  lotSize?: number;
  name?: string;
  productName?: string;
  category?: string;
}): PricingMode {
  if (productOrItem.pricingMode) {
    return productOrItem.pricingMode;
  }

  const unit = productOrItem.calculationUnit?.toLowerCase();
  if (unit === 'm2' || unit === 'cm2') {
    return 'SQUARE_METER';
  }
  if (unit === 'linear_meter') {
    return 'LINEAR_METER';
  }
  if (unit === 'lot' || unit === 'pack' || (productOrItem.lotSize && productOrItem.lotSize > 1)) {
    return 'LOT';
  }

  // Se o nome/categoria corresponder aos impressos por tiragem tradicionais
  const name = (productOrItem.name || productOrItem.productName || '').toLowerCase();
  if (
    name.includes('cartão de visita') ||
    name.includes('cartao de visita') ||
    name.includes('flyer') ||
    name.includes('panfleto') ||
    name.includes('folder')
  ) {
    return 'LOT';
  }

  return 'UNIT';
}

/**
 * Formata um resumo descritivo legível para orçamentos, detalhes e PDF
 */
export function formatItemPricingDescription(item: {
  productName: string;
  pricingMode?: PricingMode;
  quantity: number;
  lotSize?: number;
  billedQuantity?: number;
  widthMm?: number;
  heightMm?: number;
  areaM2?: number;
  linearMeters?: number;
  basePriceCents?: number;
  unitPriceCents: number;
  totalPriceCents: number;
}): string {
  const mode = inferPricingMode(item);
  const qty = item.quantity || 1;

  if (mode === 'LOT') {
    const lotSize = item.lotSize || 1000;
    const billedLots = item.billedQuantity || Math.max(1, Math.ceil(qty / lotSize));
    const lotPriceCents = item.basePriceCents || item.totalPriceCents / billedLots;
    return `${formatThousands(qty)} un. • ${billedLots} lote(s) de ${formatThousands(lotSize)} × ${formatCentsToBRL(lotPriceCents)} = ${formatCentsToBRL(item.totalPriceCents)}`;
  }

  if (mode === 'SQUARE_METER') {
    const widthM = item.widthMm ? item.widthMm / 1000 : 1;
    const heightM = item.heightMm ? item.heightMm / 1000 : 1;
    const areaM2 = item.areaM2 || (widthM * heightM * qty);
    const m2PriceCents = item.basePriceCents || (areaM2 > 0 ? Math.round(item.totalPriceCents / areaM2) : item.totalPriceCents);
    return `${qty} pç(s) ${widthM.toFixed(2)}×${heightM.toFixed(2)}m (${areaM2.toFixed(2)} m²) × ${formatCentsToBRL(m2PriceCents)}/m² = ${formatCentsToBRL(item.totalPriceCents)}`;
  }

  if (mode === 'LINEAR_METER') {
    const lenM = item.linearMeters || (item.widthMm ? item.widthMm / 1000 : 1) * qty;
    const linPriceCents = item.basePriceCents || (lenM > 0 ? Math.round(item.totalPriceCents / lenM) : item.totalPriceCents);
    return `${qty} pç(s) (${lenM.toFixed(2)} m lin.) × ${formatCentsToBRL(linPriceCents)}/m = ${formatCentsToBRL(item.totalPriceCents)}`;
  }

  // UNIT
  const unitPrice = item.basePriceCents || item.unitPriceCents || Math.round(item.totalPriceCents / qty);
  return `${formatThousands(qty)} un. × ${formatCentsToBRL(unitPrice)} = ${formatCentsToBRL(item.totalPriceCents)}`;
}
