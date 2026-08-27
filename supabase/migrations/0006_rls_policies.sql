-- =============================================================================
-- Migration: 0006_rls_policies.sql
-- Description: Políticas de Row Level Security (RLS) para Isolamento Estrito Multiempresa
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Habilitar RLS em Todas as 16 Tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finishings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finishing_product_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_quote_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_item_finishings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. POLÍTICAS: PROFILES (Sem recursão via helper SECURITY DEFINER can_view_profile)
-- =============================================================================
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated
USING (can_view_profile(id));

CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =============================================================================
-- 3. POLÍTICAS: ORGANIZATIONS
-- =============================================================================
CREATE POLICY "organizations_select_member" ON public.organizations
FOR SELECT TO authenticated
USING (is_org_member(id) AND deleted_at IS NULL);

CREATE POLICY "organizations_insert_authenticated" ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update_admin" ON public.organizations
FOR UPDATE TO authenticated
USING (is_org_admin(id) AND deleted_at IS NULL)
WITH CHECK (is_org_admin(id) AND deleted_at IS NULL);

-- =============================================================================
-- 4. POLÍTICAS: ORGANIZATION_MEMBERS (Sem recursão infinita)
-- =============================================================================
CREATE POLICY "org_members_select_member" ON public.organization_members
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "org_members_insert_admin" ON public.organization_members
FOR INSERT TO authenticated
WITH CHECK (
  is_org_admin(organization_id)
  OR NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_members.organization_id)
);

CREATE POLICY "org_members_update_admin" ON public.organization_members
FOR UPDATE TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "org_members_delete_admin" ON public.organization_members
FOR DELETE TO authenticated
USING (is_org_admin(organization_id));

-- =============================================================================
-- 5. POLÍTICAS: PRODUCT_SUBSCRIPTIONS (Contrato Preparatório Prexyon)
-- =============================================================================
CREATE POLICY "subscriptions_select_member" ON public.product_subscriptions
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "subscriptions_write_admin" ON public.product_subscriptions
FOR ALL TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

-- =============================================================================
-- 6. POLÍTICAS: CUSTOMERS & CUSTOMER_CONTACTS
-- =============================================================================
CREATE POLICY "customers_select_member" ON public.customers
FOR SELECT TO authenticated
USING (is_org_member(organization_id) AND deleted_at IS NULL);

CREATE POLICY "customers_insert_authorized" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'customers', 'create')
);

CREATE POLICY "customers_update_authorized" ON public.customers
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'customers', 'edit')
  AND deleted_at IS NULL
)
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'customers', 'edit')
  AND deleted_at IS NULL
);

CREATE POLICY "customers_delete_authorized" ON public.customers
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'customers', 'delete')
);

CREATE POLICY "contacts_select_member" ON public.customer_contacts
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "contacts_insert_authorized" ON public.customer_contacts
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'customers', 'create') OR has_org_permission(organization_id, 'customers', 'edit'))
);

CREATE POLICY "contacts_update_authorized" ON public.customer_contacts
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'customers', 'create') OR has_org_permission(organization_id, 'customers', 'edit'))
)
WITH CHECK (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'customers', 'create') OR has_org_permission(organization_id, 'customers', 'edit'))
);

CREATE POLICY "contacts_delete_authorized" ON public.customer_contacts
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'customers', 'delete')
);

-- =============================================================================
-- 7. POLÍTICAS: PRODUCTS, MATERIALS, FINISHINGS & COMPATIBILITY
-- =============================================================================
CREATE POLICY "products_select_member" ON public.products
FOR SELECT TO authenticated
USING (is_org_member(organization_id) AND deleted_at IS NULL);

CREATE POLICY "products_insert_authorized" ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'create')
);

CREATE POLICY "products_update_authorized" ON public.products
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'edit')
  AND deleted_at IS NULL
)
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'edit')
  AND deleted_at IS NULL
);

CREATE POLICY "products_delete_authorized" ON public.products
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'delete')
);

CREATE POLICY "materials_select_member" ON public.materials
FOR SELECT TO authenticated
USING (is_org_member(organization_id) AND deleted_at IS NULL);

CREATE POLICY "materials_insert_authorized" ON public.materials
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'create')
);

CREATE POLICY "materials_update_authorized" ON public.materials
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'edit')
  AND deleted_at IS NULL
)
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'edit')
  AND deleted_at IS NULL
);

CREATE POLICY "materials_delete_authorized" ON public.materials
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'delete')
);

CREATE POLICY "finishings_select_member" ON public.finishings
FOR SELECT TO authenticated
USING (is_org_member(organization_id) AND deleted_at IS NULL);

CREATE POLICY "finishings_insert_authorized" ON public.finishings
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'create')
);

CREATE POLICY "finishings_update_authorized" ON public.finishings
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'edit')
  AND deleted_at IS NULL
)
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'edit')
  AND deleted_at IS NULL
);

CREATE POLICY "finishings_delete_authorized" ON public.finishings
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'delete')
);

CREATE POLICY "finishing_compat_select_member" ON public.finishing_product_compatibility
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "finishing_compat_insert_authorized" ON public.finishing_product_compatibility
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'create')
);

CREATE POLICY "finishing_compat_delete_authorized" ON public.finishing_product_compatibility
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'products', 'delete')
);

-- =============================================================================
-- 8. POLÍTICAS: ORGANIZATION_QUOTE_SEQUENCES
-- =============================================================================
CREATE POLICY "sequences_select_member" ON public.organization_quote_sequences
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "sequences_write_admin" ON public.organization_quote_sequences
FOR ALL TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

-- =============================================================================
-- 9. POLÍTICAS: QUOTES, QUOTE_ITEMS & QUOTE_ITEM_FINISHINGS
-- =============================================================================
CREATE POLICY "quotes_select_member" ON public.quotes
FOR SELECT TO authenticated
USING (is_org_member(organization_id) AND deleted_at IS NULL);

CREATE POLICY "quotes_insert_authorized" ON public.quotes
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'quotes', 'create')
);

CREATE POLICY "quotes_update_authorized" ON public.quotes
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'quotes', 'edit')
  AND deleted_at IS NULL
)
WITH CHECK (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'quotes', 'edit')
  AND deleted_at IS NULL
);

CREATE POLICY "quotes_delete_admin" ON public.quotes
FOR DELETE TO authenticated
USING (
  is_org_member(organization_id)
  AND has_org_permission(organization_id, 'quotes', 'delete')
);

CREATE POLICY "quote_items_select_member" ON public.quote_items
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "quote_items_insert_authorized" ON public.quote_items
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'quotes', 'create') OR has_org_permission(organization_id, 'quotes', 'edit'))
);

CREATE POLICY "quote_items_update_authorized" ON public.quote_items
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'quotes', 'create') OR has_org_permission(organization_id, 'quotes', 'edit'))
)
WITH CHECK (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'quotes', 'create') OR has_org_permission(organization_id, 'quotes', 'edit'))
);

CREATE POLICY "quote_finishings_select_member" ON public.quote_item_finishings
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "quote_finishings_insert_authorized" ON public.quote_item_finishings
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'quotes', 'create') OR has_org_permission(organization_id, 'quotes', 'edit'))
);

CREATE POLICY "quote_finishings_update_authorized" ON public.quote_item_finishings
FOR UPDATE TO authenticated
USING (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'quotes', 'create') OR has_org_permission(organization_id, 'quotes', 'edit'))
)
WITH CHECK (
  is_org_member(organization_id)
  AND (has_org_permission(organization_id, 'quotes', 'create') OR has_org_permission(organization_id, 'quotes', 'edit'))
);

-- =============================================================================
-- 10. POLÍTICAS: QUOTE_EVENTS & AUDIT_LOGS (Append-Only)
-- =============================================================================
CREATE POLICY "quote_events_select_member" ON public.quote_events
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "quote_events_insert_member" ON public.quote_events
FOR INSERT TO authenticated
WITH CHECK (is_org_member(organization_id));

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
FOR SELECT TO authenticated
USING (is_org_member(organization_id));

CREATE POLICY "audit_logs_insert_member" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (is_org_member(organization_id));

