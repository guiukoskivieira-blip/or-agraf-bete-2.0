-- =============================================================================
-- Migration: 0003_commercial_catalog.sql
-- Description: Catálogo Comercial: Clientes, Contatos, Produtos, Insumos e Acabamentos
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type customer_type NOT NULL DEFAULT 'company',
  name TEXT NOT NULL,
  corporate_name TEXT,
  document TEXT,
  state_registration TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- Índices de consulta e isolamento
CREATE INDEX IF NOT EXISTS idx_customers_org_active ON customers(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(organization_id, name) WHERE deleted_at IS NULL;

-- Unicidade de Documento (CPF/CNPJ) POR ORGANIZAÇÃO (ignora vazios e excluídos)
-- Permite que o mesmo cliente exista em diferentes gráficas (isolamento multiempresa)
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_org_doc ON customers(organization_id, document)
 WHERE document IS NOT NULL AND document <> '' AND deleted_at IS NULL;

-- 2. Contatos dos Clientes
CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_cust ON customer_contacts(customer_id);

-- 3. Catálogo de Produtos Gráficos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'prints',
  short_description TEXT,
  pricing_mode pricing_mode NOT NULL DEFAULT 'UNIT',
  lot_size INTEGER CHECK (lot_size IS NULL OR lot_size > 0),
  calculation_unit calculation_unit NOT NULL DEFAULT 'unit',
  default_width_mm NUMERIC CHECK (default_width_mm IS NULL OR default_width_mm > 0),
  default_height_mm NUMERIC CHECK (default_height_mm IS NULL OR default_height_mm > 0),
  default_quantity NUMERIC NOT NULL DEFAULT 1 CHECK (default_quantity > 0),
  default_material TEXT,
  default_finishing TEXT,
  production_days INTEGER NOT NULL DEFAULT 3 CHECK (production_days >= 0),
  base_cost_cents BIGINT NOT NULL DEFAULT 0 CHECK (base_cost_cents >= 0),
  markup_percent NUMERIC NOT NULL DEFAULT 0 CHECK (markup_percent >= 0),
  sale_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (sale_price_cents >= 0),
  min_sale_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (min_sale_price_cents >= 0),
  has_price_configured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  internal_notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(organization_id, category) WHERE deleted_at IS NULL;

-- Unicidade de SKU POR ORGANIZAÇÃO
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_sku ON products(organization_id, sku)
 WHERE sku IS NOT NULL AND sku <> '' AND deleted_at IS NULL;

-- 4. Insumos e Substratos (Materiais)
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  unit TEXT NOT NULL DEFAULT 'unit',
  cost_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (cost_price_cents >= 0),
  sale_price_cents BIGINT DEFAULT 0 CHECK (sale_price_cents IS NULL OR sale_price_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_materials_org_active ON materials(organization_id, is_active) WHERE deleted_at IS NULL;

-- 5. Acabamentos Técnicos
CREATE TABLE IF NOT EXISTS finishings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_basis finishing_pricing_basis NOT NULL DEFAULT 'FIXED',
  price_status finishing_price_status NOT NULL DEFAULT 'CONFIGURED',
  price_cents BIGINT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  cost_price_cents BIGINT DEFAULT 0 CHECK (cost_price_cents IS NULL OR cost_price_cents >= 0),
  sale_price_cents BIGINT DEFAULT 0 CHECK (sale_price_cents IS NULL OR sale_price_cents >= 0),
  default_markup_percent NUMERIC DEFAULT 0 CHECK (default_markup_percent IS NULL OR default_markup_percent >= 0),
  applies_to_all_products BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_default_selected BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_finishing_price_status_consistency CHECK (
    (price_status = 'FREE' AND price_cents = 0) OR
    (price_status = 'NOT_CONFIGURED' AND price_cents = 0) OR
    (price_status = 'CONFIGURED' AND price_cents >= 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_finishings_org_active ON finishings(organization_id, is_active) WHERE deleted_at IS NULL;

-- 6. Compatibilidade Canônica entre Acabamentos e Produtos por IDs
CREATE TABLE IF NOT EXISTS finishing_product_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finishing_id UUID NOT NULL REFERENCES finishings(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_finishing_product_link UNIQUE (organization_id, finishing_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_finishing_compat_product ON finishing_product_compatibility(product_id);
CREATE INDEX IF NOT EXISTS idx_finishing_compat_finishing ON finishing_product_compatibility(finishing_id);
