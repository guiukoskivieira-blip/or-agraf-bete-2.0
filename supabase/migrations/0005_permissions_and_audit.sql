-- =============================================================================
-- Migration: 0005_permissions_and_audit.sql
-- Description: Auditoria de Segurança e Funções Auxiliares de Permissões RBAC
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Logs de Auditoria de Usuários e Permissões
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  performed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_user_name TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_name TEXT,
  action_type audit_action_type NOT NULL,
  description TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_user_id);

-- 2. Trigger: Imutabilidade Estrita de Logs de Auditoria
CREATE OR REPLACE FUNCTION prevent_audit_logs_modification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Operação negada: a tabela audit_logs é um registro append-only e não permite alterações ou exclusões.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_logs_modification ON audit_logs;
CREATE TRIGGER trg_prevent_audit_logs_modification
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_modification_trigger();

-- 3. Funções Auxiliares de Autorização e Membresia (SECURITY DEFINER com search_path = '')

-- Obtém o ID do usuário autenticado de forma segura
CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS pg_catalog.uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

-- Verifica se o usuário atual é membro ativo e não bloqueado da organização
CREATE OR REPLACE FUNCTION is_org_member(p_org_id pg_catalog.uuid)
RETURNS pg_catalog.bool
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.organization_members
     WHERE organization_id = p_org_id
       AND user_id = auth.uid()
       AND is_active = true
       AND is_locked = false
  );
$$;

-- Verifica se o usuário autenticado pode visualizar o perfil de outro usuário (mesma organização)
CREATE OR REPLACE FUNCTION can_view_profile(p_target_user_id pg_catalog.uuid)
RETURNS pg_catalog.bool
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    p_target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.organization_members om1
        JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
       WHERE om1.user_id = auth.uid()
         AND om1.is_active = true
         AND om1.is_locked = false
         AND om2.user_id = p_target_user_id
         AND om2.is_active = true
    )
  );
$$;

-- Obtém o papel do usuário atual na organização
CREATE OR REPLACE FUNCTION get_org_role(p_org_id pg_catalog.uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
    FROM public.organization_members
   WHERE organization_id = p_org_id
     AND user_id = auth.uid()
     AND is_active = true
     AND is_locked = false
   LIMIT 1;
$$;

-- Verifica se o usuário atual é Owner ou Admin na organização
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id pg_catalog.uuid)
RETURNS pg_catalog.bool
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.organization_members
     WHERE organization_id = p_org_id
       AND user_id = auth.uid()
       AND role IN ('owner'::public.user_role, 'admin'::public.user_role)
       AND is_active = true
       AND is_locked = false
  );
$$;

-- Verifica se o usuário atual possui permissão para um módulo e ação específicos
CREATE OR REPLACE FUNCTION has_org_permission(p_org_id pg_catalog.uuid, p_module pg_catalog.text, p_action pg_catalog.text)
RETURNS pg_catalog.bool
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_perms pg_catalog.jsonb;
  v_action_arr pg_catalog.jsonb;
BEGIN
  SELECT role, permissions_json
    INTO v_role, v_perms
    FROM public.organization_members
   WHERE organization_id = p_org_id
     AND user_id = auth.uid()
     AND is_active = true
     AND is_locked = false;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Owners e Admins têm permissão total em todos os módulos
  IF v_role IN ('owner'::public.user_role, 'admin'::public.user_role) THEN
    RETURN true;
  END IF;

  -- Viewers têm somente permissão de leitura ('view')
  IF v_role = 'viewer'::public.user_role THEN
    RETURN (p_action = 'view');
  END IF;

  -- Verifica matriz granular de permissões customizadas
  IF v_perms ? p_module THEN
    v_action_arr := v_perms -> p_module;
    IF pg_catalog.jsonb_typeof(v_action_arr) = 'array' THEN
      RETURN v_action_arr ? p_action;
    END IF;
  END IF;

  -- Regras padrão por papel quando não customizado
  IF v_role = 'manager'::public.user_role THEN
    RETURN true;
  ELSIF v_role = 'seller'::public.user_role THEN
    IF p_module = 'quotes' THEN
      RETURN true;
    ELSIF p_module = 'customers' THEN
      RETURN p_action IN ('view', 'create', 'edit', 'export');
    ELSIF p_module = 'products' THEN
      RETURN p_action IN ('view', 'view_values');
    ELSIF p_module = 'general' THEN
      RETURN p_action IN ('view', 'view_values');
    END IF;
  ELSIF v_role = 'reception'::public.user_role THEN
    IF p_module = 'quotes' THEN
      RETURN p_action IN ('view', 'create', 'edit', 'export', 'view_values', 'change_status', 'send_whatsapp');
    ELSIF p_module = 'customers' THEN
      RETURN p_action IN ('view', 'create', 'edit');
    ELSIF p_module = 'products' THEN
      RETURN p_action IN ('view', 'view_values');
    ELSIF p_module = 'general' THEN
      RETURN p_action IN ('view');
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Revoga acesso público/anônimo e concede a authenticated
REVOKE ALL ON FUNCTION get_auth_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_auth_user_id() TO authenticated;

REVOKE ALL ON FUNCTION is_org_member(pg_catalog.uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_org_member(pg_catalog.uuid) TO authenticated;

REVOKE ALL ON FUNCTION can_view_profile(pg_catalog.uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_view_profile(pg_catalog.uuid) TO authenticated;

REVOKE ALL ON FUNCTION get_org_role(pg_catalog.uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_org_role(pg_catalog.uuid) TO authenticated;

REVOKE ALL ON FUNCTION is_org_admin(pg_catalog.uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_org_admin(pg_catalog.uuid) TO authenticated;

REVOKE ALL ON FUNCTION has_org_permission(pg_catalog.uuid, pg_catalog.text, pg_catalog.text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION has_org_permission(pg_catalog.uuid, pg_catalog.text, pg_catalog.text) TO authenticated;

