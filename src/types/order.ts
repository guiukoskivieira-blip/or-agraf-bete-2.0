/**
 * @file order.ts
 * @description Contratos de Domínio para Pedidos Comerciais (Pós-aprovação)
 * @project OrçaGraf - Etapa 1 Fundação
 * 
 * NOTA DE ARQUITETURA:
 * O Pedido no OrçaGraf representa o compromisso comercial aprovado.
 * A gestão operacional de chão de fábrica/produção será de responsabilidade do produto independente ArteFlow.
 * O OrçaGraf apenas mantém o status comercial e os itens autorizados.
 */

export type OrderStatus = 
  | 'pending_payment'   // Aguardando confirmação financeira inicial
  | 'confirmed'         // Confirmado comercialmente / liberado
  | 'in_production'     // Em execução no setor produtivo
  | 'ready_for_pickup'  // Pronto para retirada ou envio
  | 'delivered'         // Entregue / Concluído
  | 'cancelled';        // Cancelado

export interface OrderItem {
  id: string;
  quoteItemId?: string;
  productName: string;
  quantity: number;
  specificationsSummary: string;
  unitPriceCents: number;
  totalPriceCents: number;
}

export interface Order {
  id: string;
  tenantId: string; // Isolamento multiempresa obrigatório
  orderNumber: string; // ex: "PED-2026-0001"
  quoteId?: string; // Orçamento de origem
  customerId: string;
  customerName: string;
  status: OrderStatus;
  
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  
  deliveryMethod?: 'pickup' | 'shipping' | 'carrier';
  deliveryAddress?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  
  salespersonId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
