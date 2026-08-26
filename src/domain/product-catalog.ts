/**
 * @file product-catalog.ts
 * @description Catálogo Inicial com os 15 Produtos Oficiais do OrçaGraf, Vínculos de Acabamentos e Modalidades de Precificação
 * @project OrçaGraf
 * 
 * 15 PRODUTOS CLASSIFICADOS POR MODALIDADE:
 * - LOTE/TIRAGEM (LOT):
 *   1. Cartão de visita (1.000 un.)
 *   2. Flyer (1.000 un.)
 *   3. Panfleto (1.000 un.)
 *   4. Folder (1.000 un.)
 * 
 * - METRO QUADRADO (SQUARE_METER):
 *   5. Banner em lona (m²)
 *   6. Adesivo impresso (m²)
 *   7. Adesivo de recorte (m²)
 *   8. Placa em PVC (m²)
 *   9. Placa em ACM (m²)
 *   10. Fachada (m²)
 *   11. Plotagem de veículo (m²)
 * 
 * - METRO LINEAR (LINEAR_METER):
 *   12. Faixa em lona (m linear)
 * 
 * - UNIDADE (UNIT):
 *   13. Cardápio (un.)
 *   14. Wind banner (un.)
 *   15. Cartaz (un.)
 */

import { Product, CalculationUnit, Material, Finishing, ProductFinishingLink, PricingMode, FinishingPricingBasis, FinishingPriceStatus } from '../types/product';
import { calculateItemPricing, inferPricingMode } from './pricing-engine';

/**
 * Retorna os 15 modelos de produtos oficiais para um tenant específico,
 * incluindo a configuração de modalidade determinística de precificação.
 */
export function getInitialProductsTemplate(tenantId: string): Product[] {
  const timestamp = '2026-02-25T00:00:00.000Z';

  return [
    // 1. Cartão de visita (LOTE DE 1.000 UNIDADES)
    {
      id: `prod_${tenantId}_cartao_visita`,
      tenantId,
      sku: 'PRD-CART-01',
      name: 'Cartão de visita',
      category: 'prints',
      shortDescription: 'Cartão de visita profissional para identificação comercial e networking.',
      pricingMode: 'LOT',
      lotSize: 1000,
      calculationUnit: 'unit',
      defaultWidthMm: 90,
      defaultHeightMm: 50,
      defaultQuantity: 1000,
      defaultMaterial: 'Papel couchê 300 g',
      availableMaterials: ['Papel couchê 300 g', 'Papel couchê 250 g', 'Papel offset 75 g'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Laminação fosca', 'Laminação brilho', 'Verniz localizado', 'Cantos arredondados'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Laminação fosca', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
        { finishingName: 'Laminação brilho', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Verniz localizado', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
        { finishingName: 'Cantos arredondados', isRequired: false, isDefaultSelected: false, displayOrder: 5, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 3500, // R$ 35,00 por lote
      markupPercent: 100,
      salePriceCents: 7000, // R$ 70,00 por lote de 1.000 unidades
      minSalePriceCents: 5000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Padrão 9x5cm. Preço cadastrado para tiragem/lote de 1.000 un.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 2. Flyer (LOTE DE 1.000 UNIDADES)
    {
      id: `prod_${tenantId}_flyer`,
      tenantId,
      sku: 'PRD-FLY-02',
      name: 'Flyer',
      category: 'prints',
      shortDescription: 'Folheto promocional ágil para divulgação de eventos, ofertas e serviços.',
      pricingMode: 'LOT',
      lotSize: 1000,
      calculationUnit: 'unit',
      defaultWidthMm: 100,
      defaultHeightMm: 140,
      defaultQuantity: 1000,
      defaultMaterial: 'Papel couchê 150 g',
      availableMaterials: ['Papel couchê 90 g', 'Papel couchê 150 g', 'Papel couchê 250 g'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Dobra'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Dobra', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 4000, // R$ 40,00 por lote
      markupPercent: 80,
      salePriceCents: 7200, // R$ 72,00 por lote de 1.000 unidades
      minSalePriceCents: 5000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Formato 10x14cm. Preço cadastrado para lote de 1.000 un.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 3. Panfleto (LOTE DE 1.000 UNIDADES)
    {
      id: `prod_${tenantId}_panfleto`,
      tenantId,
      sku: 'PRD-PANF-03',
      name: 'Panfleto',
      category: 'prints',
      shortDescription: 'Panfleto em papel couché para distribuição em massa e campanhas locais.',
      pricingMode: 'LOT',
      lotSize: 1000,
      calculationUnit: 'unit',
      defaultWidthMm: 150,
      defaultHeightMm: 210,
      defaultQuantity: 1000,
      defaultMaterial: 'Papel couchê 90 g',
      availableMaterials: ['Papel couchê 90 g', 'Papel couchê 150 g', 'Papel sulfite 90 g'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 5500, // R$ 55,00 por lote
      markupPercent: 80,
      salePriceCents: 9900, // R$ 99,00 por lote de 1.000 unidades
      minSalePriceCents: 7000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Formato A5 (15x21cm). Preço cadastrado para lote de 1.000 un.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 4. Folder (LOTE DE 1.000 UNIDADES)
    {
      id: `prod_${tenantId}_folder`,
      tenantId,
      sku: 'PRD-FOLD-04',
      name: 'Folder',
      category: 'prints',
      shortDescription: 'Folder institucional ou de produtos com vincos e dobras comerciais.',
      pricingMode: 'LOT',
      lotSize: 1000,
      calculationUnit: 'unit',
      defaultWidthMm: 210,
      defaultHeightMm: 297,
      defaultQuantity: 1000,
      defaultMaterial: 'Papel couchê 150 g',
      availableMaterials: ['Papel couchê 150 g', 'Papel couchê 250 g', 'Papel couchê 300 g'],
      defaultFinishing: 'Dobra',
      availableFinishings: ['Refile', 'Vinco', 'Dobra'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Vinco', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
        { finishingName: 'Dobra', isRequired: true, isDefaultSelected: true, displayOrder: 3, isActive: true },
      ],
      productionDays: 3,
      baseCostCents: 8000, // R$ 80,00 por lote
      markupPercent: 85,
      salePriceCents: 14800, // R$ 148,00 por lote de 1.000 unidades
      minSalePriceCents: 10000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'A4 aberto (21x29,7cm). Preço cadastrado para lote de 1.000 un.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 5. Cardápio (UNIDADE)
    {
      id: `prod_${tenantId}_cardapio`,
      tenantId,
      sku: 'PRD-CARD-05',
      name: 'Cardápio',
      category: 'prints',
      shortDescription: 'Cardápio para restaurantes e lanchonetes com acabamento lavável de alta resistência.',
      pricingMode: 'UNIT',
      calculationUnit: 'unit',
      defaultWidthMm: 210,
      defaultHeightMm: 297,
      defaultQuantity: 10,
      defaultMaterial: 'Papel couchê 300 g',
      availableMaterials: ['Papel couchê 300 g', 'Papel couchê 250 g', 'PVC expandido 2 mm'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Laminação fosca', 'Laminação brilho', 'Dobra', 'Cantos arredondados'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Laminação fosca', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
        { finishingName: 'Laminação brilho', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Dobra', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
        { finishingName: 'Cantos arredondados', isRequired: false, isDefaultSelected: false, displayOrder: 5, isActive: true },
      ],
      productionDays: 3,
      baseCostCents: 1200, // R$ 12,00 por unidade
      markupPercent: 100,
      salePriceCents: 2400, // R$ 24,00 por unidade
      minSalePriceCents: 1800,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Formato A4. Precificação cobrada por unidade.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 6. Banner em lona (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_banner_lona`,
      tenantId,
      sku: 'PRD-BAN-06',
      name: 'Banner em lona',
      category: 'visual_comm',
      shortDescription: 'Banner impresso em lona de alta resolução com acabamento para suspensão.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 800, // 0.80m
      defaultHeightMm: 1200, // 1.20m
      defaultQuantity: 1,
      defaultMaterial: 'Lona frontlight 440 g',
      availableMaterials: ['Lona frontlight 440 g', 'Lona blackout'],
      defaultFinishing: 'Bastão e cordão',
      availableFinishings: ['Refile', 'Solda de lona', 'Ilhós', 'Bastão e cordão'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Solda de lona', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
        { finishingName: 'Ilhós', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Bastão e cordão', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 3500, // R$ 35,00 por m²
      markupPercent: 100,
      salePriceCents: 7000, // R$ 70,00 por m²
      minSalePriceCents: 4500,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Cálculo por área total: Área = Largura (m) × Altura (m) × Qtd.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 7. Faixa em lona (METRO LINEAR)
    {
      id: `prod_${tenantId}_faixa_lona`,
      tenantId,
      sku: 'PRD-FAIX-07',
      name: 'Faixa em lona',
      category: 'visual_comm',
      shortDescription: 'Faixa horizontal em lona com reforço lateral e acabamento para amarração rápida.',
      pricingMode: 'LINEAR_METER',
      calculationUnit: 'linear_meter',
      defaultWidthMm: 3000, // 3 metros de comprimento
      defaultHeightMm: 700, // 0.70m de altura técnica
      defaultQuantity: 1,
      defaultMaterial: 'Lona frontlight 440 g',
      availableMaterials: ['Lona frontlight 440 g', 'Lona blackout'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Solda de lona', 'Ilhós'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Solda de lona', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
        { finishingName: 'Ilhós', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 2500, // R$ 25,00 por metro linear
      markupPercent: 100,
      salePriceCents: 5000, // R$ 50,00 por metro linear
      minSalePriceCents: 6000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Cálculo por comprimento: Comprimento total = Comprimento (m) × Qtd.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 8. Adesivo impresso (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_adesivo_impresso`,
      tenantId,
      sku: 'PRD-ADE-08',
      name: 'Adesivo impresso',
      category: 'stickers',
      shortDescription: 'Adesivo vinil com impressão digital colorida de alta resolução em plotter.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 1000, // 1m
      defaultHeightMm: 1000, // 1m
      defaultQuantity: 1,
      defaultMaterial: 'Vinil adesivo branco',
      availableMaterials: ['Vinil adesivo branco', 'Vinil adesivo transparente', 'Vinil adesivo perfurado'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Corte especial', 'Laminação fosca', 'Laminação brilho', 'Aplicação'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Corte especial', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
        { finishingName: 'Laminação fosca', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Laminação brilho', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
        { finishingName: 'Aplicação', isRequired: false, isDefaultSelected: false, displayOrder: 5, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 3800, // R$ 38,00 por m²
      markupPercent: 110,
      salePriceCents: 8000, // R$ 80,00 por m²
      minSalePriceCents: 3000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Impressão digital vinil adesivo. Precificado por m².',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 9. Adesivo de recorte (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_adesivo_recorte`,
      tenantId,
      sku: 'PRD-REC-09',
      name: 'Adesivo de recorte',
      category: 'stickers',
      shortDescription: 'Vinil colorido vazado recortado em plotter eletrônica com máscara de aplicação.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 1000,
      defaultHeightMm: 1000,
      defaultQuantity: 1,
      defaultMaterial: 'Vinil para recorte',
      availableMaterials: ['Vinil para recorte', 'Vinil adesivo branco'],
      defaultFinishing: 'Corte eletrônico',
      availableFinishings: ['Corte eletrônico', 'Aplicação'],
      linkedFinishings: [
        { finishingName: 'Corte eletrônico', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Aplicação', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 4500, // R$ 45,00 por m²
      markupPercent: 120,
      salePriceCents: 9900, // R$ 99,00 por m²
      minSalePriceCents: 4000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Vetor obrigatório. Precificado por m².',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 10. Placa em PVC (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_placa_pvc`,
      tenantId,
      sku: 'PRD-PVC-10',
      name: 'Placa em PVC',
      category: 'boards_facades',
      shortDescription: 'Placa rígida em PVC expandido com aplicação frontal de vinil adesivo.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 1000,
      defaultHeightMm: 1000,
      defaultQuantity: 1,
      defaultMaterial: 'PVC expandido 2 mm',
      availableMaterials: ['PVC expandido 2 mm', 'PVC expandido 3 mm', 'PVC expandido 5 mm', 'Polionda'],
      defaultFinishing: 'Corte reto',
      availableFinishings: ['Corte reto', 'Corte especial', 'Fita dupla face', 'Furação', 'Instalação'],
      linkedFinishings: [
        { finishingName: 'Corte reto', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Corte especial', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
        { finishingName: 'Fita dupla face', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Furação', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
        { finishingName: 'Instalação', isRequired: false, isDefaultSelected: false, displayOrder: 5, isActive: true },
      ],
      productionDays: 3,
      baseCostCents: 6500, // R$ 65,00 por m²
      markupPercent: 100,
      salePriceCents: 13000, // R$ 130,00 por m²
      minSalePriceCents: 5000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Leve, resistente à umidade, precificado por m².',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 11. Placa em ACM (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_placa_acm`,
      tenantId,
      sku: 'PRD-ACM-11',
      name: 'Placa em ACM',
      category: 'boards_facades',
      shortDescription: 'Placa de Alumínio Composto (ACM 3mm) de altíssima durabilidade e estabilidade climática.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 1000,
      defaultHeightMm: 1000,
      defaultQuantity: 1,
      defaultMaterial: 'ACM 3 mm',
      availableMaterials: ['ACM 3 mm', 'PVC expandido 3 mm'],
      defaultFinishing: 'Corte reto',
      availableFinishings: ['Corte reto', 'Corte especial', 'Fita dupla face', 'Furação', 'Instalação'],
      linkedFinishings: [
        { finishingName: 'Corte reto', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Corte especial', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
        { finishingName: 'Fita dupla face', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Furação', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
        { finishingName: 'Instalação', isRequired: false, isDefaultSelected: false, displayOrder: 5, isActive: true },
      ],
      productionDays: 5,
      baseCostCents: 14000, // R$ 140,00 por m²
      markupPercent: 90,
      salePriceCents: 26500, // R$ 265,00 por m²
      minSalePriceCents: 12000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Material nobre para placas externas, totens e identificação predial.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 12. Wind banner (UNIDADE)
    {
      id: `prod_${tenantId}_wind_banner`,
      tenantId,
      sku: 'PRD-WIND-12',
      name: 'Wind banner',
      category: 'signage',
      shortDescription: 'Kit completo de wind banner com haste articulada, tecido sublimado e base de apoio.',
      pricingMode: 'UNIT',
      calculationUnit: 'unit',
      defaultWidthMm: 700,
      defaultHeightMm: 2200,
      defaultQuantity: 1,
      defaultMaterial: 'Tecido para wind banner',
      availableMaterials: ['Tecido para wind banner'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Costura', 'Bainha'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Costura', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
        { finishingName: 'Bainha', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
      ],
      productionDays: 4,
      baseCostCents: 11000, // R$ 110,00 por kit
      markupPercent: 100,
      salePriceCents: 22000, // R$ 220,00 por kit/unidade
      minSalePriceCents: 18000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Kit completo. Precificado por unidade.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 13. Fachada (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_fachada`,
      tenantId,
      sku: 'PRD-FACH-13',
      name: 'Fachada',
      category: 'boards_facades',
      shortDescription: 'Estrutura metálica com revestimento em ACM e comunicação visual completa para fachadas.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 4000, // 4 metros
      defaultHeightMm: 1200, // 1.20 metros
      defaultQuantity: 1,
      defaultMaterial: 'ACM 3 mm',
      availableMaterials: ['ACM 3 mm', 'Lona frontlight 440 g', 'PVC expandido 5 mm'],
      defaultFinishing: 'Instalação',
      availableFinishings: ['Corte reto', 'Instalação', 'Fita dupla face', 'Aplicação'],
      linkedFinishings: [
        { finishingName: 'Corte reto', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Instalação', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
        { finishingName: 'Fita dupla face', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Aplicação', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
      ],
      productionDays: 10,
      baseCostCents: 22000, // R$ 220,00 por m²
      markupPercent: 100,
      salePriceCents: 44000, // R$ 440,00 por m²
      minSalePriceCents: 150000, // R$ 1.500,00 mínimo
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Exige conferência técnica prévia de medidas no local e memorial de fixação.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 14. Plotagem de veículo (METRO QUADRADO - m²)
    {
      id: `prod_${tenantId}_plotagem_veiculo`,
      tenantId,
      sku: 'PRD-PLOT-14',
      name: 'Plotagem de veículo',
      category: 'visual_comm',
      shortDescription: 'Envelopamento parcial ou total de veículos e frotas comerciais com vinil cast automotivo.',
      pricingMode: 'SQUARE_METER',
      calculationUnit: 'm2',
      defaultWidthMm: 1000,
      defaultHeightMm: 1000,
      defaultQuantity: 1,
      defaultMaterial: 'Vinil adesivo branco',
      availableMaterials: ['Vinil adesivo branco', 'Vinil adesivo perfurado', 'Vinil para recorte'],
      defaultFinishing: 'Aplicação',
      availableFinishings: ['Refile', 'Corte eletrônico', 'Aplicação'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Corte eletrônico', isRequired: true, isDefaultSelected: true, displayOrder: 2, isActive: true },
        { finishingName: 'Aplicação', isRequired: true, isDefaultSelected: true, displayOrder: 3, isActive: true },
      ],
      productionDays: 3,
      baseCostCents: 8500, // R$ 85,00 por m²
      markupPercent: 110,
      salePriceCents: 18000, // R$ 180,00 por m²
      minSalePriceCents: 25000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'O veículo deve ser entregue lavado, desengordurado e seco para a aplicação.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 15. Cartaz (UNIDADE)
    {
      id: `prod_${tenantId}_cartaz`,
      tenantId,
      sku: 'PRD-CARTZ-15',
      name: 'Cartaz',
      category: 'prints',
      shortDescription: 'Cartaz promocional para vitrines, paredes, portas e murais informativos.',
      pricingMode: 'UNIT',
      calculationUnit: 'unit',
      defaultWidthMm: 297, // A3
      defaultHeightMm: 420,
      defaultQuantity: 10,
      defaultMaterial: 'Papel couchê 150 g',
      availableMaterials: ['Papel couchê 150 g', 'Papel couchê 250 g', 'Papel fotográfico', 'Papel sulfite 90 g'],
      defaultFinishing: 'Refile',
      availableFinishings: ['Refile', 'Laminação fosca', 'Laminação brilho', 'Fita dupla face'],
      linkedFinishings: [
        { finishingName: 'Refile', isRequired: true, isDefaultSelected: true, displayOrder: 1, isActive: true },
        { finishingName: 'Laminação fosca', isRequired: false, isDefaultSelected: false, displayOrder: 2, isActive: true },
        { finishingName: 'Laminação brilho', isRequired: false, isDefaultSelected: false, displayOrder: 3, isActive: true },
        { finishingName: 'Fita dupla face', isRequired: false, isDefaultSelected: false, displayOrder: 4, isActive: true },
      ],
      productionDays: 2,
      baseCostCents: 250, // R$ 2,50 por unidade
      markupPercent: 140,
      salePriceCents: 600, // R$ 6,00 por unidade
      minSalePriceCents: 400,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Formato A3 (30x42cm). Precificado por unidade.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

/**
 * Função Legada de Cálculo com Redirecionamento para o Motor Central
 */
export interface ProductPriceCalculationParams {
  pricingMode?: PricingMode;
  calculationUnit?: CalculationUnit;
  salePriceCents: number;
  quantity: number;
  lotSize?: number;
  widthMm?: number;
  heightMm?: number;
  lengthMeters?: number;
  minSalePriceCents?: number;
}

export interface ProductPriceCalculationResult {
  unitPriceCents: number;
  totalPriceCents: number;
  areaM2?: number;
  linearMeters?: number;
  hasPrice: boolean;
}

export function calculateProductPrice(params: ProductPriceCalculationParams): ProductPriceCalculationResult {
  const mode = params.pricingMode || inferPricingMode({
    calculationUnit: params.calculationUnit,
    lotSize: params.lotSize,
  });

  const res = calculateItemPricing({
    pricingMode: mode,
    salePriceCents: params.salePriceCents,
    quantity: params.quantity,
    lotSize: params.lotSize,
    widthMm: params.widthMm,
    heightMm: params.heightMm,
    lengthMeters: params.lengthMeters,
    minSalePriceCents: params.minSalePriceCents,
  });

  const singlePieceArea = (params.widthMm && params.heightMm)
    ? (params.widthMm / 1000) * (params.heightMm / 1000)
    : res.areaM2;

  return {
    unitPriceCents: res.unitPriceEquivalentCents,
    totalPriceCents: res.totalItemCents,
    areaM2: singlePieceArea,
    linearMeters: res.linearMeters,
    hasPrice: res.basePriceCents > 0,
  };
}

/**
 * Garante a inicialização idempotente dos 15 produtos para uma empresa,
 * com migração segura de modalidade de preço e tamanho de lote.
 */
export function initializeTenantProducts(existingProducts: Product[], tenantId: string): Product[] {
  const templates = getInitialProductsTemplate(tenantId);
  const tenantExisting = existingProducts.filter(p => p.tenantId === tenantId);

  if (tenantExisting.length === 0) {
    return [...existingProducts, ...templates];
  }

  // Atualiza produtos existentes que não tinham pricingMode ou lotSize preenchidos
  const updatedExisting = existingProducts.map(p => {
    if (p.tenantId === tenantId) {
      const template = templates.find(t => t.sku === p.sku || t.name.toLowerCase() === p.name.toLowerCase());
      const inferredMode = template?.pricingMode || inferPricingMode(p);
      const lotSize = p.lotSize || template?.lotSize || (inferredMode === 'LOT' ? 1000 : undefined);

      return {
        ...p,
        pricingMode: p.pricingMode || inferredMode,
        lotSize,
        linkedFinishings: (p.linkedFinishings && p.linkedFinishings.length > 0)
          ? p.linkedFinishings
          : template?.linkedFinishings,
      };
    }
    return p;
  });

  const existingSkus = new Set(tenantExisting.map(p => p.sku));
  const newToAdd = templates.filter(tmpl => !existingSkus.has(tmpl.sku));

  return [...updatedExisting, ...newToAdd];
}

/**
 * Retorna os 21 Insumos (Materiais) oficiais para um tenant específico
 */
export function getInitialMaterialsTemplate(tenantId: string): Material[] {
  const timestamp = '2026-02-25T00:00:00.000Z';

  const rawMaterials: { name: string; category: string; unit: 'sheet' | 'm2' | 'kg' | 'unit' | 'roll' }[] = [
    { name: 'Papel couchê 90 g', category: 'Papéis', unit: 'sheet' },
    { name: 'Papel couchê 150 g', category: 'Papéis', unit: 'sheet' },
    { name: 'Papel couchê 250 g', category: 'Papéis', unit: 'sheet' },
    { name: 'Papel couchê 300 g', category: 'Papéis', unit: 'sheet' },
    { name: 'Papel offset 75 g', category: 'Papéis', unit: 'sheet' },
    { name: 'Papel sulfite 90 g', category: 'Papéis', unit: 'sheet' },
    { name: 'Lona frontlight 440 g', category: 'Lonas', unit: 'm2' },
    { name: 'Lona blackout', category: 'Lonas', unit: 'm2' },
    { name: 'Vinil adesivo branco', category: 'Adesivos', unit: 'm2' },
    { name: 'Vinil adesivo transparente', category: 'Adesivos', unit: 'm2' },
    { name: 'Vinil adesivo perfurado', category: 'Adesivos', unit: 'm2' },
    { name: 'Vinil para recorte', category: 'Adesivos', unit: 'm2' },
    { name: 'PVC expandido 2 mm', category: 'Chapas Rígidas', unit: 'm2' },
    { name: 'PVC expandido 3 mm', category: 'Chapas Rígidas', unit: 'm2' },
    { name: 'PVC expandido 5 mm', category: 'Chapas Rígidas', unit: 'm2' },
    { name: 'ACM 3 mm', category: 'Chapas Rígidas', unit: 'm2' },
    { name: 'Papel fotográfico', category: 'Papéis Especiais', unit: 'm2' },
    { name: 'Polionda', category: 'Chapas Rígidas', unit: 'm2' },
    { name: 'Tecido para wind banner', category: 'Tecidos', unit: 'm2' },
    { name: 'Laminação fosca', category: 'Películas', unit: 'm2' },
    { name: 'Laminação brilho', category: 'Películas', unit: 'm2' },
  ];

  return rawMaterials.map((mat, idx) => ({
    id: `mat_${tenantId}_${idx + 1}`,
    tenantId,
    name: mat.name,
    category: mat.category,
    unit: mat.unit,
    costPriceCents: 0,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/**
 * Retorna os 21 Acabamentos oficiais para um tenant específico,
 * estruturados com base de cobrança explícita e status comercial de preço.
 */
export function getInitialFinishingsTemplate(tenantId: string): Finishing[] {
  const timestamp = '2026-02-25T00:00:00.000Z';

  const rawFinishings: {
    name: string;
    description: string;
    pricingBasis: FinishingPricingBasis;
    isRequired: boolean;
    priceStatus: FinishingPriceStatus;
    priceCents: number;
    compatibleProducts?: string[];
  }[] = [
    {
      name: 'Refile',
      description: 'Refile técnico padrão para corte final e esquadro.',
      pricingBasis: 'PER_UNIT',
      isRequired: true,
      priceStatus: 'FREE',
      priceCents: 0,
      compatibleProducts: ['Cartão de visita', 'Flyer', 'Folder', 'Bloco de notas', 'Crachá', 'Tag'],
    },
    {
      name: 'Corte reto',
      description: 'Corte linear reto padrão em placas e substratos rígidos.',
      pricingBasis: 'PER_UNIT',
      isRequired: true,
      priceStatus: 'FREE',
      priceCents: 0,
      compatibleProducts: ['Placa em PS', 'Adesivo vinil'],
    },
    {
      name: 'Corte especial',
      description: 'Corte com faca gráfica ou formato personalizado sob medida.',
      pricingBasis: 'PER_UNIT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Adesivo vinil', 'Placa em PS'],
    },
    {
      name: 'Corte eletrônico',
      description: 'Corte digital em plotter de recorte.',
      pricingBasis: 'PER_SQUARE_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Adesivo de recorte'],
    },
    {
      name: 'Cantos arredondados',
      description: 'Arredondamento de cantos (canto moeda).',
      pricingBasis: 'FIXED',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Cartão de visita', 'Crachá', 'Tag'],
    },
    {
      name: 'Dobra',
      description: 'Dobra simples ou sanfonada para folhetos.',
      pricingBasis: 'PER_UNIT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Flyer', 'Folder'],
    },
    {
      name: 'Vinco',
      description: 'Vinco mecânico para facilitar dobra sem quebrar a fibra.',
      pricingBasis: 'PER_UNIT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Folder', 'Cartaz'],
    },
    {
      name: 'Furação',
      description: 'Furo central ou padrão para cordão e fixação.',
      pricingBasis: 'PER_UNIT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Tag', 'Crachá'],
    },
    {
      name: 'Ilhós',
      description: 'Ilhós metálico antiferrugem nas pontas ou percurso.',
      pricingBasis: 'PER_UNIT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Banner em lona', 'Faixa em lona', 'Lona backlight'],
    },
    {
      name: 'Bastão e cordão',
      description: 'Bastão de madeira/plástico com ponteiras e cordão para banner.',
      pricingBasis: 'FIXED',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Banner em lona'],
    },
    {
      name: 'Bainha',
      description: 'Bainha perimetral com solda térmica para reforço de lona.',
      pricingBasis: 'PER_LINEAR_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Banner em lona', 'Faixa em lona'],
    },
    {
      name: 'Solda de lona',
      description: 'Solda térmica eletrônica para emendas em grande formato.',
      pricingBasis: 'PER_LINEAR_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Banner em lona', 'Lona backlight'],
    },
    {
      name: 'Laminação fosca',
      description: 'Película protetora fosca BOPP aplicada a quente.',
      pricingBasis: 'PER_SQUARE_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Cartão de visita', 'Folder', 'Adesivo vinil'],
    },
    {
      name: 'Laminação brilho',
      description: 'Película protetora brilho BOPP aplicada a quente.',
      pricingBasis: 'PER_SQUARE_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Cartão de visita', 'Folder', 'Adesivo vinil'],
    },
    {
      name: 'Verniz localizado',
      description: 'Máscara de verniz UV localizado em áreas selecionadas.',
      pricingBasis: 'PER_LOT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Cartão de visita'],
    },
    {
      name: 'Fita dupla face',
      description: 'Aplicação de fita dupla face de alta adesão no verso.',
      pricingBasis: 'FIXED',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Placa em PS'],
    },
    {
      name: 'Encadernação',
      description: 'Encadernação espiral ou wire-o com capa cristal/preta.',
      pricingBasis: 'PER_UNIT',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Bloco de notas'],
    },
    {
      name: 'Aplicação',
      description: 'Serviço técnico de aplicação e alinhamento de vinil adesivo.',
      pricingBasis: 'PER_SQUARE_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Adesivo vinil', 'Placa em PS'],
    },
    {
      name: 'Instalação',
      description: 'Serviço de fixação e instalação da peça no local do cliente.',
      pricingBasis: 'FIXED',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Placa em PS', 'Banner em lona'],
    },
    {
      name: 'Fundo branco',
      description: 'Aplicação de camada de tinta branca sob mídias transparentes.',
      pricingBasis: 'PER_SQUARE_METER',
      isRequired: false,
      priceStatus: 'NOT_CONFIGURED',
      priceCents: 0,
      compatibleProducts: ['Adesivo vinil'],
    },
    {
      name: 'Costura',
      description: 'Costura reforçada de borda e passagem de haste para tecido.',
      pricingBasis: 'PER_UNIT',
      isRequired: true,
      priceStatus: 'FREE',
      priceCents: 0,
      compatibleProducts: ['Wind banner'],
    },
  ];

  return rawFinishings.map((fin, idx) => ({
    id: `fin_${tenantId}_${idx + 1}`,
    tenantId,
    name: fin.name,
    description: fin.description,
    pricingBasis: fin.pricingBasis,
    pricingMethod: fin.pricingBasis,
    priceCents: fin.priceCents,
    costPriceCents: 0,
    salePriceCents: fin.priceCents,
    priceStatus: fin.priceStatus,
    isRequired: fin.isRequired,
    isDefaultSelected: fin.isRequired,
    compatibleProducts: fin.compatibleProducts,
    defaultMarkupPercent: 0,
    isActive: true,
    dataOrigin: 'demo',
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function initializeTenantMaterials(existingMaterials: Material[], tenantId: string): Material[] {
  const templates = getInitialMaterialsTemplate(tenantId);
  const tenantExisting = existingMaterials.filter(m => m.tenantId === tenantId);

  if (tenantExisting.length === 0) {
    return [...existingMaterials, ...templates];
  }

  const existingNames = new Set(tenantExisting.map(m => m.name.toLowerCase()));
  const newToAdd = templates.filter(tmpl => !existingNames.has(tmpl.name.toLowerCase()));

  return [...existingMaterials, ...newToAdd];
}

export function initializeTenantFinishings(existingFinishings: Finishing[], tenantId: string): Finishing[] {
  const templates = getInitialFinishingsTemplate(tenantId);
  const tenantExisting = existingFinishings.filter(f => f.tenantId === tenantId);

  if (tenantExisting.length === 0) {
    return [...existingFinishings, ...templates];
  }

  const existingMap = new Map(tenantExisting.map(f => [f.name.toLowerCase(), f]));

  // Migração e preservação idempotente
  const merged: Finishing[] = templates.map(tmpl => {
    const existing = existingMap.get(tmpl.name.toLowerCase());
    if (!existing) return tmpl;

    return {
      ...tmpl,
      ...existing,
      pricingBasis: existing.pricingBasis || tmpl.pricingBasis,
      priceStatus: existing.priceStatus || (existing.costPriceCents && existing.costPriceCents > 0 ? 'CONFIGURED' : tmpl.priceStatus),
      priceCents: existing.priceCents !== undefined ? existing.priceCents : (existing.costPriceCents || tmpl.priceCents),
    };
  });

  // Mantém também acabamentos customizados criados pelo usuário
  const templateNames = new Set(templates.map(t => t.name.toLowerCase()));
  const customUserFinishings = tenantExisting.filter(f => !templateNames.has(f.name.toLowerCase()));

  return [...merged, ...customUserFinishings];
}
