-- =============================================================================
-- Migration: 0002_identity_and_organizations.sql
-- Description: Identidade, Organizações (Gráficas), Membresia e Assinaturas
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Perfis de Usuário (vinculados ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index para buscas rápidas de perfis
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. Organizações (Gráficas / Tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name TEXT NOT NULL,
  corporate_name TEXT,
  document TEXT,
  state_registration TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding_json JSONB NOT NULL DEFAULT '{"primaryColor": "#2563eb", "secondaryColor": "#0d9488", "showLogoInQuotes": true}'::jsonb,
  customization_json JSONB NOT NULL DEFAULT '{"headerNote": "Proposta comercial para impressão gráfica.", "footerDisclaimer": "Garantia contra defeitos de fabricação de até 30 dias.", "defaultPaymentTerms": "Pix à vista", "defaultProductionDays": 3, "commercialNotes": "Arquivos fechados conforme gabarito.", "showTechnicalDetailsToCustomer": true}'::jsonb,
  settings_json JSONB NOT NULL DEFAULT '{"currency": "BRL"}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active) WHERE deleted_at IS NULL;

-- 3. Membros da Organização (Associação N:N entre Usuários e Gráficas)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  base_profile base_profile NOT NULL DEFAULT 'custom',
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_member_user_org UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id, is_active) WHERE is_locked = false;
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id, is_active) WHERE is_locked = false;

-- 4. Função e Trigger: Proteção Estrita contra Remoção ou Desativação do Último Owner Ativo
CREATE OR REPLACE FUNCTION check_last_active_owner_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id pg_catalog.uuid;
  v_active_owners_count pg_catalog.int4;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_org_id := OLD.organization_id;
    IF (OLD.role = 'owner'::public.user_role AND OLD.is_active = true AND OLD.is_locked = false) THEN
      SELECT pg_catalog.count(*)
        INTO v_active_owners_count
        FROM public.organization_members
       WHERE organization_id = v_org_id
         AND role = 'owner'::public.user_role
         AND is_active = true
         AND is_locked = false
         AND id <> OLD.id;

      IF (v_active_owners_count = 0) THEN
        RAISE EXCEPTION 'Operação negada: não é permitido excluir o único proprietário (owner) ativo da organização.';
      END IF;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (NEW.organization_id <> OLD.organization_id) THEN
      RAISE EXCEPTION 'Operação negada: não é permitido alterar o organization_id de um membro existente.';
    END IF;

    v_org_id := NEW.organization_id;
    IF (OLD.role = 'owner'::public.user_role AND (NEW.role <> 'owner'::public.user_role OR NEW.is_active = false OR NEW.is_locked = true)) THEN
      SELECT pg_catalog.count(*)
        INTO v_active_owners_count
        FROM public.organization_members
       WHERE organization_id = v_org_id
         AND role = 'owner'::public.user_role
         AND is_active = true
         AND is_locked = false
         AND id <> OLD.id;

      IF (v_active_owners_count = 0) THEN
        RAISE EXCEPTION 'Operação negada: não é permitido desativar, bloquear ou alterar o papel do único proprietário (owner) ativo da organização.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_active_owner ON organization_members;
CREATE TRIGGER trg_protect_last_active_owner
BEFORE UPDATE OR DELETE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION check_last_active_owner_trigger();

-- 5. Contrato Preparatório de Assinaturas (Prexyon Future Management)
-- NOTA ARQUITETURAL: Esta tabela serve como contrato de dados preparatório.
-- O OrçaGraf não implementa checkout, cobrança ou Stripe; a gestão de planos e pagamentos
-- será assumida centralizadamente pelo portal Prexyon.
CREATE TABLE IF NOT EXISTS product_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_code subscription_product_code NOT NULL DEFAULT 'orcagraf',
  status subscription_status NOT NULL DEFAULT 'pending_configuration',
  current_period_end TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{"managedBy": "prexyon_portal", "tier": "unconfigured"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_org_product_subscription UNIQUE (organization_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_prod ON product_subscriptions(organization_id, product_code);
