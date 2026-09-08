import { isFinishingCompatibleWithProduct } from './product-catalog';
import { Finishing, PricingMode } from '../types/product';

export interface QuoteFormItem {
  id?: string;
  productId?: string;
  productName: string;
  isCustom?: boolean;
  pricingMode: PricingMode;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  lotSize?: number;
  widthMm?: number;
  heightMm?: number;
  lengthMeters?: number;
  materialName?: string;
  notes?: string;
  finishings?: Array<{
    finishingId?: string;
    name: string;
    selected?: boolean;
    priceStatus?: 'CALCULATED' | 'MANUAL' | 'INCLUDED' | 'NOT_CONFIGURED';
    isRequired?: boolean;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface QuoteFormValidationParams {
  customerName: string;
  customerContact?: string;
  customerDocument?: string;
  customerEmail?: string;
  items: QuoteFormItem[];
  catalogFinishings?: Finishing[];
  tenantId?: string;
}

export interface QuoteFormValidationResult {
  isValid: boolean;
  title?: string;
  message?: string;
  field?: string;
  itemIndex?: number;
  sanitizedItems?: QuoteFormItem[];
}

/**
 * Validação essencial para emissão de orçamentos.
 * Garante que apenas campos comerciais mandatórios bloqueiem a criação
 * e emite mensagens claras e contextualizadas identificando o campo e item exatos.
 */
export function validateQuoteForm(params: QuoteFormValidationParams): QuoteFormValidationResult {
  const { customerName, items, catalogFinishings = [], tenantId = '' } = params;

  if (!customerName || !customerName.trim()) {
    return {
      isValid: false,
      title: 'Campo Obrigatório',
      message: 'Informe o nome do cliente.',
      field: 'customerName',
    };
  }

  if (!items || items.length === 0) {
    return {
      isValid: false,
      title: 'Itens Ausentes',
      message: 'Adicione pelo menos um item ao orçamento.',
      field: 'items',
    };
  }

  // Preserva os itens sem copiar notes para productName
  const sanitizedItems: QuoteFormItem[] = items.map(it => ({
    ...it,
    productName: (it.productName || '').trim(),
  }));

  for (let index = 0; index < sanitizedItems.length; index++) {
    const it = sanitizedItems[index];
    const itemNumber = index + 1;
    const itemLabel = it.productName ? `"${it.productName}" (Item ${itemNumber})` : `Item ${itemNumber}`;

    if (!it.productName || !it.productName.trim()) {
      return {
        isValid: false,
        title: 'Identificação do Item Ausente',
        message: `Informe a identificação ou nome do item ${itemNumber}.`,
        field: `items[${index}].productName`,
        itemIndex: index,
      };
    }

    if (!it.quantity || it.quantity <= 0 || isNaN(it.quantity)) {
      return {
        isValid: false,
        title: 'Quantidade Inválida',
        message: `Informe uma quantidade maior que zero para o ${itemLabel}.`,
        field: `items[${index}].quantity`,
        itemIndex: index,
      };
    }

    if (it.totalPriceCents <= 0 || it.unitPriceCents <= 0) {
      return {
        isValid: false,
        title: 'Item Sem Preço',
        message: `O ${itemLabel} está sem preço definido. Informe o valor unitário para prosseguir.`,
        field: `items[${index}].unitPriceCents`,
        itemIndex: index,
      };
    }

    if (it.pricingMode === 'LOT' && (!it.lotSize || it.lotSize <= 0)) {
      return {
        isValid: false,
        title: 'Lote Inválido',
        message: `Informe um tamanho de lote maior que zero para o ${itemLabel}.`,
        field: `items[${index}].lotSize`,
        itemIndex: index,
      };
    }

    if (it.pricingMode === 'SQUARE_METER') {
      if (!it.widthMm || it.widthMm <= 0 || !it.heightMm || it.heightMm <= 0) {
        return {
          isValid: false,
          title: 'Dimensões Inválidas',
          message: `Informe largura e altura válidas (maiores que zero em mm) para o ${itemLabel}.`,
          field: `items[${index}].dimensions`,
          itemIndex: index,
        };
      }
    }

    if (it.pricingMode === 'LINEAR_METER') {
      const len = it.lengthMeters || (it.widthMm ? it.widthMm / 1000 : 0);
      if (len <= 0) {
        return {
          isValid: false,
          title: 'Comprimento Inválido',
          message: `Informe um comprimento válido (maior que zero em metros) para o ${itemLabel}.`,
          field: `items[${index}].lengthMeters`,
          itemIndex: index,
        };
      }
    }

    // Bloqueio de acabamento selecionado sem preço configurado
    if (it.finishings) {
      const unconfiguredSelectedFin = it.finishings.find(
        f => f.selected && f.priceStatus === 'NOT_CONFIGURED'
      );
      if (unconfiguredSelectedFin) {
        return {
          isValid: false,
          title: 'Acabamento Sem Preço',
          message: `O acabamento "${unconfiguredSelectedFin.name}" no ${itemLabel} está com preço não configurado. Desmarque-o ou configure seu valor no catálogo antes de salvar.`,
          field: `items[${index}].finishings`,
          itemIndex: index,
        };
      }

      // Bloqueio de acabamento incompatível com o produto do item
      if (it.productId && catalogFinishings.length > 0) {
        for (const f of it.finishings.filter(fin => fin.selected)) {
          const catalogFin = catalogFinishings.find(
            cf => cf.id === f.finishingId || cf.name.toLowerCase() === f.name.toLowerCase()
          );
          if (
            catalogFin &&
            !isFinishingCompatibleWithProduct(catalogFin, it.productId, tenantId) &&
            !f.isRequired
          ) {
            return {
              isValid: false,
              title: 'Acabamento Incompatível',
              message: `O acabamento "${f.name}" no ${itemLabel} não é compatível com este produto. Revise os acabamentos antes de salvar.`,
              field: `items[${index}].finishings`,
              itemIndex: index,
            };
          }
        }
      }
    }
  }

  return {
    isValid: true,
    sanitizedItems,
  };
}
