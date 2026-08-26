/**
 * @file product-catalog.ts
 * @description Catálogo Inicial com os 15 Produtos Oficiais do OrçaGraf, Vínculos de Acabamentos e Regras de Precificação
 * @project OrçaGraf
 * 
 * 15 PRODUTOS INICIAIS OFICIAIS:
 * 1. Cartão de visita (unit)
 * 2. Flyer (unit)
 * 3. Panfleto (unit)
 * 4. Folder (unit)
 * 5. Cardápio (unit)
 * 6. Banner em lona (m2)
 * 7. Faixa em lona (linear_meter)
 * 8. Adesivo impresso (m2)
 * 9. Adesivo de recorte (m2)
 * 10. Placa em PVC (m2)
 * 11. Placa em ACM (m2)
 * 12. Wind banner (unit)
 * 13. Fachada (m2)
 * 14. Plotagem de veículo (m2)
 * 15. Cartaz (unit)
 */

import { Product, CalculationUnit, Material, Finishing, ProductFinishingLink } from '../types/product';

/**
 * Retorna os 15 modelos de produtos oficiais para um tenant específico,
 * incluindo a configuração inicial de acabamentos vinculados.
 */
export function getInitialProductsTemplate(tenantId: string): Product[] {
  const timestamp = '2026-02-25T00:00:00.000Z';

  return [
    // 1. Cartão de visita (Unitário)
    {
      id: `prod_${tenantId}_cartao_visita`,
      tenantId,
      sku: 'PRD-CART-01',
      name: 'Cartão de visita',
      category: 'prints',
      shortDescription: 'Cartão de visita profissional para identificação comercial e networking.',
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
      baseCostCents: 3500, // R$ 35,00
      markupPercent: 100,
      salePriceCents: 7000, // R$ 70,00
      minSalePriceCents: 5000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Padrão 9x5cm. Fechamento de arquivo em CMYK com 3mm de sangria e margem interna de segurança.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 2. Flyer (Unitário)
    {
      id: `prod_${tenantId}_flyer`,
      tenantId,
      sku: 'PRD-FLY-02',
      name: 'Flyer',
      category: 'prints',
      shortDescription: 'Folheto promocional ágil para divulgação de eventos, ofertas e serviços.',
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
      baseCostCents: 4000, // R$ 40,00
      markupPercent: 80,
      salePriceCents: 7200, // R$ 72,00
      minSalePriceCents: 5000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Formato 10x14cm (1/4 de sulfite). Ideal para ações rápidas de distribuição.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 3. Panfleto (Unitário)
    {
      id: `prod_${tenantId}_panfleto`,
      tenantId,
      sku: 'PRD-PANF-03',
      name: 'Panfleto',
      category: 'prints',
      shortDescription: 'Panfleto em papel couché para distribuição em massa e campanhas locais.',
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
      baseCostCents: 5500, // R$ 55,00
      markupPercent: 80,
      salePriceCents: 9900, // R$ 99,00
      minSalePriceCents: 7000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Formato A5 (15x21cm). Conferir marcas de corte e margem de sangra.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 4. Folder (Unitário com dobra)
    {
      id: `prod_${tenantId}_folder`,
      tenantId,
      sku: 'PRD-FOLD-04',
      name: 'Folder',
      category: 'prints',
      shortDescription: 'Folder institucional ou de produtos com vincos e dobras comerciais.',
      calculationUnit: 'unit',
      defaultWidthMm: 210,
      defaultHeightMm: 297,
      defaultQuantity: 500,
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
      baseCostCents: 8000, // R$ 80,00
      markupPercent: 85,
      salePriceCents: 14800, // R$ 148,00
      minSalePriceCents: 10000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'A4 aberto (21x29,7cm). Vinco técnico obrigatório para gramaturas acima de 150g.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 5. Cardápio (Unitário)
    {
      id: `prod_${tenantId}_cardapio`,
      tenantId,
      sku: 'PRD-CARD-05',
      name: 'Cardápio',
      category: 'prints',
      shortDescription: 'Cardápio para restaurantes e lanchonetes com acabamento lavável de alta resistência.',
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
      internalNotes: 'Formato A4. Acabamento lavável e proteção UV.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 6. Banner em lona (Área em m²)
    {
      id: `prod_${tenantId}_banner_lona`,
      tenantId,
      sku: 'PRD-BAN-06',
      name: 'Banner em lona',
      category: 'visual_comm',
      shortDescription: 'Banner impresso em lona de alta resolução com acabamento para suspensão.',
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
      internalNotes: 'Cálculo automático: Área = Largura (m) × Altura (m). Valor = Área × Preço/m² × Quantidade.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 7. Faixa em lona (Metro Linear)
    {
      id: `prod_${tenantId}_faixa_lona`,
      tenantId,
      sku: 'PRD-FAIX-07',
      name: 'Faixa em lona',
      category: 'visual_comm',
      shortDescription: 'Faixa horizontal em lona com reforço lateral e acabamento para amarração rápida.',
      calculationUnit: 'linear_meter',
      defaultWidthMm: 3000, // 3 metros de comprimento
      defaultHeightMm: 700, // 0.70m de altura
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
      internalNotes: 'Calculado por comprimento (metro linear). Valor = Comprimento (m) × Preço/m linear × Quantidade.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 8. Adesivo impresso (Área em m²)
    {
      id: `prod_${tenantId}_adesivo_impresso`,
      tenantId,
      sku: 'PRD-ADE-08',
      name: 'Adesivo impresso',
      category: 'stickers',
      shortDescription: 'Adesivo vinil com impressão digital colorida de alta resolução em plotter.',
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
      internalNotes: 'Impressão digital eco-solvente ou UV. Resistente à água.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 9. Adesivo de recorte (Área em m²)
    {
      id: `prod_${tenantId}_adesivo_recorte`,
      tenantId,
      sku: 'PRD-REC-09',
      name: 'Adesivo de recorte',
      category: 'stickers',
      shortDescription: 'Vinil colorido vazado recortado em plotter eletrônica com máscara de aplicação.',
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
      internalNotes: 'Vetor obrigatório. Precificação calculada por área total ou unitária.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 10. Placa em PVC (Área em m²)
    {
      id: `prod_${tenantId}_placa_pvc`,
      tenantId,
      sku: 'PRD-PVC-10',
      name: 'Placa em PVC',
      category: 'boards_facades',
      shortDescription: 'Placa rígida em PVC expandido com aplicação frontal de vinil adesivo.',
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
      internalNotes: 'Leve, resistente à umidade, excelente acabamento para sinalização.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 11. Placa em ACM (Área em m²)
    {
      id: `prod_${tenantId}_placa_acm`,
      tenantId,
      sku: 'PRD-ACM-11',
      name: 'Placa em ACM',
      category: 'boards_facades',
      shortDescription: 'Placa de Alumínio Composto (ACM 3mm) de altíssima durabilidade e estabilidade climática.',
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

    // 12. Wind banner (Unitário)
    {
      id: `prod_${tenantId}_wind_banner`,
      tenantId,
      sku: 'PRD-WIND-12',
      name: 'Wind banner',
      category: 'signage',
      shortDescription: 'Kit completo de wind banner com haste articulada, tecido sublimado e base de apoio.',
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
      salePriceCents: 22000, // R$ 220,00 por kit
      minSalePriceCents: 18000,
      hasPriceConfigured: true,
      isActive: true,
      internalNotes: 'Impressão digital por sublimação com cores vivas e lavável.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // 13. Fachada (Área em m²)
    {
      id: `prod_${tenantId}_fachada`,
      tenantId,
      sku: 'PRD-FACH-13',
      name: 'Fachada',
      category: 'boards_facades',
      shortDescription: 'Estrutura metálica com revestimento em ACM e comunicação visual completa para fachadas.',
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

    // 14. Plotagem de veículo (Área em m²)
    {
      id: `prod_${tenantId}_plotagem_veiculo`,
      tenantId,
      sku: 'PRD-PLOT-14',
      name: 'Plotagem de veículo',
      category: 'visual_comm',
      shortDescription: 'Envelopamento parcial ou total de veículos e frotas comerciais com vinil cast automotivo.',
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

    // 15. Cartaz (Unitário)
    {
      id: `prod_${tenantId}_cartaz`,
      tenantId,
      sku: 'PRD-CARTZ-15',
      name: 'Cartaz',
      category: 'prints',
      shortDescription: 'Cartaz promocional para vitrines, paredes, portas e murais informativos.',
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
      internalNotes: 'Formato A3 (30x42cm). Impressão digital colorida de alto contraste.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

/**
 * Calcula o preço unitário e total de um item gráfico a partir da unidade e medidas informadas
 * 
 * Regras Obrigatórias:
 * - Todos os cálculos monetários retornam em centavos inteiros (BRL).
 * - Área em m² = (largura_mm / 1000) * (altura_mm / 1000)
 * - Metro linear = (largura_mm / 1000) ou (comprimento_m)
 * - Respeita o valor mínimo configurado (se aplicável)
 */
export interface ProductPriceCalculationParams {
  calculationUnit: CalculationUnit;
  salePriceCents: number; // Preço de venda configurado na unidade (ex: por m², por metro linear ou unitário)
  quantity: number;
  widthMm?: number;
  heightMm?: number;
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
  const {
    calculationUnit,
    salePriceCents,
    quantity,
    widthMm,
    heightMm,
    minSalePriceCents = 0,
  } = params;

  const safeQty = Math.max(1, Math.round(quantity || 1));
  const safeSalePrice = Math.max(0, Math.round(salePriceCents || 0));

  if (safeSalePrice <= 0) {
    return {
      unitPriceCents: 0,
      totalPriceCents: 0,
      hasPrice: false,
    };
  }

  // 1. Cálculo por Área (Metro quadrado - m²)
  if (calculationUnit === 'm2') {
    const widthM = Math.max(0.01, (widthMm || 1000) / 1000);
    const heightM = Math.max(0.01, (heightMm || 1000) / 1000);
    const areaM2 = widthM * heightM;

    // Preço de 1 unidade com essa área
    const singlePieceCalculatedCents = Math.round(areaM2 * safeSalePrice);
    const unitPriceCents = Math.max(minSalePriceCents, singlePieceCalculatedCents);
    const totalPriceCents = unitPriceCents * safeQty;

    return {
      unitPriceCents,
      totalPriceCents,
      areaM2,
      hasPrice: true,
    };
  }

  // 2. Cálculo por Centímetro Quadrado (cm²)
  if (calculationUnit === 'cm2') {
    const widthCm = Math.max(1, (widthMm || 100) / 10);
    const heightCm = Math.max(1, (heightMm || 100) / 10);
    const areaCm2 = widthCm * heightCm;

    const singlePieceCalculatedCents = Math.round(areaCm2 * safeSalePrice);
    const unitPriceCents = Math.max(minSalePriceCents, singlePieceCalculatedCents);
    const totalPriceCents = unitPriceCents * safeQty;

    return {
      unitPriceCents,
      totalPriceCents,
      areaM2: areaCm2 / 10000,
      hasPrice: true,
    };
  }

  // 3. Cálculo por Metro Linear (linear_meter)
  if (calculationUnit === 'linear_meter') {
    const lengthM = Math.max(0.1, (widthMm || 1000) / 1000);
    const singlePieceCalculatedCents = Math.round(lengthM * safeSalePrice);
    const unitPriceCents = Math.max(minSalePriceCents, singlePieceCalculatedCents);
    const totalPriceCents = unitPriceCents * safeQty;

    return {
      unitPriceCents,
      totalPriceCents,
      linearMeters: lengthM,
      hasPrice: true,
    };
  }

  // 4. Cálculo Unitário, Pacote ou Serviço
  const unitPriceCents = Math.max(minSalePriceCents, safeSalePrice);
  const totalPriceCents = unitPriceCents * safeQty;

  return {
    unitPriceCents,
    totalPriceCents,
    hasPrice: true,
  };
}

/**
 * Garante a inicialização idempotente dos 15 produtos para uma empresa,
 * evitando duplicações caso já existam produtos com mesmo SKU ou ID.
 */
export function initializeTenantProducts(existingProducts: Product[], tenantId: string): Product[] {
  const templates = getInitialProductsTemplate(tenantId);
  const tenantExisting = existingProducts.filter(p => p.tenantId === tenantId);

  if (tenantExisting.length === 0) {
    return [...existingProducts, ...templates];
  }

  // Se já existem alguns produtos, mescla preservando existentes e adicionando faltantes por SKU
  const existingSkus = new Set(tenantExisting.map(p => p.sku));
  const newToAdd = templates.filter(tmpl => !existingSkus.has(tmpl.sku));

  // Atualiza produtos existentes que não tinham linkedFinishings preenchido
  const updatedExisting = existingProducts.map(p => {
    if (p.tenantId === tenantId && (!p.linkedFinishings || p.linkedFinishings.length === 0)) {
      const template = templates.find(t => t.sku === p.sku || t.name.toLowerCase() === p.name.toLowerCase());
      if (template?.linkedFinishings) {
        return {
          ...p,
          linkedFinishings: template.linkedFinishings,
        };
      }
    }
    return p;
  });

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
    costPriceCents: 0, // Zero e pendente de configuração conforme regra
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/**
 * Retorna os 21 Acabamentos oficiais para um tenant específico
 */
export function getInitialFinishingsTemplate(tenantId: string): Finishing[] {
  const timestamp = '2026-02-25T00:00:00.000Z';

  const rawFinishings: { name: string; pricingMethod: 'unit' | 'area_m2' | 'fixed' | 'mil' }[] = [
    { name: 'Refile', pricingMethod: 'unit' },
    { name: 'Corte reto', pricingMethod: 'unit' },
    { name: 'Corte especial', pricingMethod: 'unit' },
    { name: 'Corte eletrônico', pricingMethod: 'area_m2' },
    { name: 'Cantos arredondados', pricingMethod: 'unit' },
    { name: 'Dobra', pricingMethod: 'unit' },
    { name: 'Vinco', pricingMethod: 'unit' },
    { name: 'Furação', pricingMethod: 'unit' },
    { name: 'Ilhós', pricingMethod: 'unit' },
    { name: 'Bastão e cordão', pricingMethod: 'unit' },
    { name: 'Bainha', pricingMethod: 'unit' },
    { name: 'Solda de lona', pricingMethod: 'unit' },
    { name: 'Laminação fosca', pricingMethod: 'area_m2' },
    { name: 'Laminação brilho', pricingMethod: 'area_m2' },
    { name: 'Verniz localizado', pricingMethod: 'unit' },
    { name: 'Fita dupla face', pricingMethod: 'unit' },
    { name: 'Encadernação', pricingMethod: 'unit' },
    { name: 'Aplicação', pricingMethod: 'area_m2' },
    { name: 'Instalação', pricingMethod: 'fixed' },
    { name: 'Fundo branco', pricingMethod: 'area_m2' },
    { name: 'Costura', pricingMethod: 'unit' },
  ];

  return rawFinishings.map((fin, idx) => ({
    id: `fin_${tenantId}_${idx + 1}`,
    tenantId,
    name: fin.name,
    pricingMethod: fin.pricingMethod,
    costPriceCents: 0, // Zero e pendente de configuração conforme regra
    defaultMarkupPercent: 0,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/**
 * Garante a inicialização idempotente dos 21 insumos para uma empresa,
 * evitando duplicações caso já existam insumos com o mesmo nome.
 */
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

/**
 * Garante a inicialização idempotente dos 21 acabamentos para uma empresa,
 * evitando duplicações caso já existam acabamentos com o mesmo nome.
 */
export function initializeTenantFinishings(existingFinishings: Finishing[], tenantId: string): Finishing[] {
  const templates = getInitialFinishingsTemplate(tenantId);
  const tenantExisting = existingFinishings.filter(f => f.tenantId === tenantId);

  if (tenantExisting.length === 0) {
    return [...existingFinishings, ...templates];
  }

  const existingNames = new Set(tenantExisting.map(f => f.name.toLowerCase()));
  const newToAdd = templates.filter(tmpl => !existingNames.has(tmpl.name.toLowerCase()));

  return [...existingFinishings, ...newToAdd];
}
