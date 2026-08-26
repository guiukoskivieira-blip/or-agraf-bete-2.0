/**
 * @file product.ts
 * @description Contratos de Domínio para Produtos Gráficos, Materiais e Acabamentos do OrçaGraf
 * @project OrçaGraf
 * 
 * REGRAS MONETÁRIAS E UNIDADES:
 * 1. Todos os custos e preços em centavos inteiros (BRL).
 * 2. Unidades permitidas: unit, m2, linear_meter, cm2, service, pack.
 * 3. Categorias: Impressos, Comunicação visual, Adesivos, Placas e fachadas, Sinalização, Serviços personalizados.
 * 4. Isolamento estrito por tenantId.
 */

export type ProductCategory =
  | 'prints'            // Impressos
  | 'visual_comm'       // Comunicação visual
  | 'stickers'          // Adesivos
  | 'boards_facades'    // Placas e fachadas
  | 'signage'           // Sinalização
  | 'custom_services';  // Serviços personalizados

export type PricingMode = 'UNIT' | 'LOT' | 'SQUARE_METER' | 'LINEAR_METER';

export const PRICING_MODES: { id: PricingMode; label: string; shortSuffix: string; description: string }[] = [
  { id: 'UNIT', label: 'Por Unidade', shortSuffix: '/un.', description: 'Cobrança por peça individual (ex: Wind banner, Cardápio, Cartaz)' },
  { id: 'LOT', label: 'Por Lote / Tiragem', shortSuffix: '/lote', description: 'Cobrança por tiragem/lote de unidades (ex: Cartão de visita, Flyer, Panfleto, Folder)' },
  { id: 'SQUARE_METER', label: 'Por Metro Quadrado (m²)', shortSuffix: '/m²', description: 'Cobrança por área calculada L × A (ex: Banner, Adesivo, Placa, Fachada)' },
  { id: 'LINEAR_METER', label: 'Por Metro Linear', shortSuffix: '/m linear', description: 'Cobrança por comprimento em metros (ex: Faixa em lona)' },
];

export type CalculationUnit =
  | 'unit'          // Unidade
  | 'm2'            // Metro quadrado
  | 'linear_meter'  // Metro linear
  | 'cm2'           // Centímetro quadrado
  | 'service'       // Serviço
  | 'pack';         // Pacote

export const PRODUCT_CATEGORIES: { id: ProductCategory; label: string; description: string }[] = [
  { id: 'prints', label: 'Impressos', description: 'Cartões, flyers, panfletos, folders, cardápios e cartazes' },
  { id: 'visual_comm', label: 'Comunicação visual', description: 'Banners, faixas, plotagem de frotas e displays' },
  { id: 'stickers', label: 'Adesivos', description: 'Adesivos impressos em vinil e adesivos de recorte eletrônico' },
  { id: 'boards_facades', label: 'Placas e fachadas', description: 'Placas em PVC, placas em ACM e estruturas de fachada' },
  { id: 'signage', label: 'Sinalização', description: 'Wind banners, totens, placas indicativas e sinalética' },
  { id: 'custom_services', label: 'Serviços personalizados', description: 'Serviços gráficos especiais e mão de obra sob demanda' },
];

export const CALCULATION_UNITS: { id: CalculationUnit; label: string; shortLabel: string }[] = [
  { id: 'unit', label: 'Unidade', shortLabel: 'un' },
  { id: 'm2', label: 'Metro quadrado (m²)', shortLabel: 'm²' },
  { id: 'linear_meter', label: 'Metro linear', shortLabel: 'm. lin.' },
  { id: 'cm2', label: 'Centímetro quadrado (cm²)', shortLabel: 'cm²' },
  { id: 'service', label: 'Serviço', shortLabel: 'serv.' },
  { id: 'pack', label: 'Pacote', shortLabel: 'pct' },
];

export interface ProductMaterialOption {
  id: string;
  name: string; // Ex: "Papel Couché 300g", "Lona 440g Frontlight"
  costPriceCents?: number;
}

export interface ProductFinishingOption {
  id: string;
  name: string; // Ex: "Laminação Fosca BOPP", "Ilhós e Reforço", "Corte Reto"
  costPriceCents?: number;
}

export interface ProductFinishingLink {
  finishingId?: string;
  finishingName: string;
  isRequired: boolean;
  isDefaultSelected: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  tenantId: string; // Isolamento multi-tenant
  sku: string; // Código SKU ou identificador curto (ex: "PROD-CART-01")
  name: string; // Nome comercial do produto
  category: ProductCategory;
  shortDescription: string; // Descrição curta
  pricingMode: PricingMode; // Modalidade determinística de precificação (UNIT | LOT | SQUARE_METER | LINEAR_METER)
  lotSize?: number; // Tamanho do lote de tiragem quando pricingMode === 'LOT' (ex: 1000)
  calculationUnit: CalculationUnit; // Unidade de cálculo (mantido para retrocompatibilidade)
  
  // Dimensões padrão (em milímetros para precisão ou metros)
  defaultWidthMm?: number; // Largura em mm (ex: 90 para 9cm, 1000 para 1m)
  defaultHeightMm?: number; // Altura em mm (ex: 50 para 5cm, 1200 para 1.2m)
  defaultQuantity: number; // Quantidade inicial sugerida
  
  // Materiais e Acabamentos
  defaultMaterial: string; // Material padrão (ex: "Papel Couché 300g")
  availableMaterials: string[]; // Lista de materiais configuráveis
  defaultFinishing: string; // Acabamento padrão (ex: "Refile Reto")
  availableFinishings: string[]; // Lista de acabamentos configuráveis
  linkedFinishings?: ProductFinishingLink[]; // Vínculo detalhado de acabamentos (obrigatórios, opcionais e automáticos)
  
  // Produção e Prazos
  productionDays: number; // Prazo estimado em dias úteis
  
  // Precificação (Valores em Centavos BRL)
  baseCostCents: number; // Custo base interno (nunca exibido ao cliente)
  markupPercent: number; // Margem de lucro em % (ex: 100 = 100%)
  salePriceCents: number; // Preço de venda configurado (unitário, por lote, por m² ou por metro linear)
  minSalePriceCents: number; // Valor mínimo de venda/faturamento do item
  hasPriceConfigured: boolean; // Flag se possui preço válido cadastrado
  
  // Status e Metadados
  isActive: boolean; // Ativo ou inativo
  internalNotes?: string; // Observações técnicas e de produção
  createdAt: string;
  updatedAt: string;
}

// Interfaces para Materiais (Insumos) e Acabamentos do Catálogo
export type PricingMethod = CalculationUnit;
export interface Material {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  unit: 'sheet' | 'm2' | 'kg' | 'unit' | 'roll';
  costPriceCents: number;
  salePriceCents?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinishingPricingBasis = 'fixed' | 'unit' | 'lot' | 'area_m2' | 'linear_meter';

export interface Finishing {
  id: string;
  tenantId: string;
  name: string;
  pricingMethod: 'unit' | 'area_m2' | 'fixed' | 'mil' | 'linear_meter' | 'lot';
  pricingBasis?: FinishingPricingBasis;
  costPriceCents: number;
  salePriceCents?: number;
  defaultMarkupPercent: number;
  compatibleProducts?: string[]; // Nomes ou SKUs de produtos compatíveis
  isRequired?: boolean; // Se é obrigatório
  isDefaultSelected?: boolean; // Se deve ser selecionado automaticamente
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
