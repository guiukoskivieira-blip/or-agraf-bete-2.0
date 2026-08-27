-- =============================================================================
-- Migration: 0004_quotes_and_snapshots.sql
-- Description: Orçamentos, Itens com Snapshots Imutáveis e Histórico Append-Only
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Controle de Sequência de Orçamentos por Organização (Geração Concorrente Segura)
CREATE TABLE IF NOT EXISTS organization_quote_sequences (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  current_year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Orçamentos Comerciais (Quotes)
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  status quote_status NOT NULL DEFAULT 'awaiting_customer',
  schema_version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT,
  
  -- Vínculo opcional ao cadastro vivo + Snapshot imutável dos dados do cliente no momento da emissão
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_document TEXT,
  customer_contact TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Valores Financeiros Canônicos em Centavos Inteiros (BRL)
  subtotal_cents BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  discount_type quote_discount_type NOT NULL DEFAULT 'none',
  discount_value NUMERIC NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  discount_applied_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_applied_cents >= 0 AND discount_applied_cents <= subtotal_cents),
  discount_reason TEXT,
  total_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  down_payment_cents BIGINT NOT NULL DEFAULT 0 CHECK (down_payment_cents >= 0 AND down_payment_cents <= total_cents),
  
  CONSTRAINT chk_quote_discount_percentage CHECK (
    discount_type <> 'percentage' OR (discount_value >= 0 AND discount_value <= 100)
  ),
  CONSTRAINT chk_quote_total_math CHECK (
    total_cents = subtotal_cents - discount_applied_cents
  ),
  
  -- Condições Comerciais e Formas de Pagamento
  payment_method payment_method NOT NULL DEFAULT 'to_be_defined',
  payment_condition payment_condition NOT NULL DEFAULT 'to_be_defined',
  installments_count INTEGER NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
  installments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  production_days INTEGER NOT NULL DEFAULT 3 CHECK (production_days >= 0),
  internal_notes TEXT,
  customer_notes TEXT,
  
  -- Gestão Comercial e Comissões (Restritas ao uso interno)
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  seller_name TEXT,
  commission_rate_percent NUMERIC CHECK (commission_rate_percent IS NULL OR (commission_rate_percent >= 0 AND commission_rate_percent <= 100)),
  commission_amount_cents BIGINT CHECK (commission_amount_cents IS NULL OR commission_amount_cents >= 0),
  
  -- Integração ArteFlow (Status do Evento QUOTE_APPROVED)
  arteflow_sync_status_json JSONB NOT NULL DEFAULT '{"status": "pending"}'::jsonb,
  
  -- Auditoria e Ciclo de Vida
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT uq_quotes_org_number UNIQUE (organization_id, quote_number)
);

CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON quotes(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_seller ON quotes(organization_id, seller_id) WHERE deleted_at IS NULL;

-- Chave de idempotência para evitar emissão duplicada acidental
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_org_idempotency ON quotes(organization_id, idempotency_key)
 WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

-- 3. Itens do Orçamento (Com Snapshot Congelado do Produto)
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Snapshot das propriedades do produto
  product_name TEXT NOT NULL,
  pricing_mode pricing_mode NOT NULL DEFAULT 'UNIT',
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  lot_size INTEGER CHECK (lot_size IS NULL OR lot_size > 0),
  billed_quantity NUMERIC NOT NULL CHECK (billed_quantity > 0),
  width_mm NUMERIC CHECK (width_mm IS NULL OR width_mm > 0),
  height_mm NUMERIC CHECK (height_mm IS NULL OR height_mm > 0),
  area_m2 NUMERIC CHECK (area_m2 IS NULL OR area_m2 >= 0),
  linear_meters NUMERIC CHECK (linear_meters IS NULL OR linear_meters >= 0),
  
  -- Valores em Centavos Inteiros
  base_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (base_price_cents >= 0),
  unit_cost_cents BIGINT NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  unit_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  total_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_price_cents >= 0),
  material_name TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- 4. Acabamentos do Item do Orçamento (Com Snapshot Congelado do Acabamento)
CREATE TABLE IF NOT EXISTS quote_item_finishings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_item_id UUID NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
  finishing_id UUID REFERENCES finishings(id) ON DELETE SET NULL,
  
  -- Snapshot das propriedades do acabamento
  name TEXT NOT NULL,
  pricing_basis finishing_pricing_basis NOT NULL DEFAULT 'FIXED',
  price_status finishing_price_status NOT NULL DEFAULT 'CONFIGURED',
  unit_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  billed_quantity NUMERIC NOT NULL DEFAULT 1 CHECK (billed_quantity > 0),
  total_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_price_cents >= 0),
  calculation_memory TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_optional BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_quote_item_finishings_item ON quote_item_finishings(quote_item_id);

-- 5. Histórico de Eventos do Orçamento (Append-Only Event Store)
CREATE TABLE IF NOT EXISTS quote_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_quote_events_quote ON quote_events(quote_id, created_at ASC);

-- 6. Trigger: Imutabilidade Estrita de Eventos (Proíbe UPDATE e DELETE)
CREATE OR REPLACE FUNCTION prevent_quote_events_modification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Operação negada: a tabela quote_events é um registro append-only e não permite alterações ou exclusões.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_quote_events_modification ON quote_events;
CREATE TRIGGER trg_prevent_quote_events_modification
BEFORE UPDATE OR DELETE ON quote_events
FOR EACH ROW
EXECUTE FUNCTION prevent_quote_events_modification_trigger();
