-- =============================================================================
-- Migration: 0008_fix_monetary_event_formatting.sql
-- Description: Correção de chamada de função pg_catalog.btrim em formatação de eventos
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- =============================================================================
-- 1. CRIAÇÃO DE ORÇAMENTO COM VALIDAÇÃO E SNAPSHOTS
-- Status: BLOQUEADA PARA PRODUÇÃO (CONTRATO INTERNO EM DESENVOLVIMENTO)
-- Correção: pg_catalog.btrim para compatibilidade com catálogo interno do PostgreSQL
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_quote_with_items(
  p_organization_id pg_catalog.uuid,
  p_quote pg_catalog.jsonb,
  p_items pg_catalog.jsonb,
  p_idempotency_key pg_catalog.text DEFAULT NULL
)
RETURNS pg_catalog.uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id pg_catalog.uuid;
  v_user_name pg_catalog.text;
  v_existing_quote_id pg_catalog.uuid;
  v_existing_total pg_catalog.int8;
  v_quote_id pg_catalog.uuid;
  v_quote_number pg_catalog.text;
  v_item RECORD;
  v_item_id pg_catalog.uuid;
  v_finishing RECORD;
  v_display_order pg_catalog.int4 := 0;
  v_fin_order pg_catalog.int4 := 0;
  
  -- Variáveis de validação e conferência
  v_computed_subtotal pg_catalog.int8 := 0;
  v_computed_discount pg_catalog.int8 := 0;
  v_computed_total pg_catalog.int8 := 0;
  v_discount_type public.quote_discount_type;
  v_discount_value pg_catalog.numeric;
  v_payload_subtotal pg_catalog.int8;
  v_payload_discount pg_catalog.int8;
  v_payload_total pg_catalog.int8;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação negada: usuário não autenticado.';
  END IF;

  IF NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Operação negada: usuário não é membro desta organização.';
  END IF;

  IF NOT public.has_org_permission(p_organization_id, 'quotes', 'create') THEN
    RAISE EXCEPTION 'Operação negada: usuário sem permissão para criar orçamentos.';
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NULL THEN
    v_user_name := 'Atendimento Comercial';
  END IF;

  -- 1. Verificação de Idempotência e Proteção contra Reutilização Inválida
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id, total_cents
      INTO v_existing_quote_id, v_existing_total
      FROM public.quotes
     WHERE organization_id = p_organization_id
       AND idempotency_key = p_idempotency_key;

    IF v_existing_quote_id IS NOT NULL THEN
      -- Se a chave existe mas o total do payload diverge, rejeita por conflito de idempotência
      IF (p_quote->>'total_cents')::pg_catalog.int8 IS NOT NULL AND (p_quote->>'total_cents')::pg_catalog.int8 <> v_existing_total THEN
        RAISE EXCEPTION 'Conflito de idempotência: a chave informada (%) já foi utilizada para uma proposta com parâmetros diferentes.', p_idempotency_key;
      END IF;
      RETURN v_existing_quote_id;
    END IF;
  END IF;

  -- 2. Validação dos Itens e Acabamentos
  IF p_items IS NULL OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Operação negada: o orçamento deve conter ao menos um item.';
  END IF;

  -- Soma dos itens informados
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(
    total_price_cents pg_catalog.int8
  ) LOOP
    v_computed_subtotal := v_computed_subtotal + COALESCE(v_item.total_price_cents, 0);
  END LOOP;

  -- Validação de Desconto Comercial
  v_discount_type := COALESCE((p_quote->>'discount_type')::public.quote_discount_type, 'none'::public.quote_discount_type);
  v_discount_value := COALESCE((p_quote->>'discount_value')::pg_catalog.numeric, 0);
  v_payload_subtotal := COALESCE((p_quote->>'subtotal_cents')::pg_catalog.int8, 0);
  v_payload_discount := COALESCE((p_quote->>'discount_applied_cents')::pg_catalog.int8, 0);
  v_payload_total := COALESCE((p_quote->>'total_cents')::pg_catalog.int8, 0);

  IF v_discount_type = 'percentage'::public.quote_discount_type THEN
    IF v_discount_value < 0 OR v_discount_value > 100 THEN
      RAISE EXCEPTION 'Desconto percentual inválido: deve estar entre 0%% e 100%% (informado: %).', v_discount_value;
    END IF;
    v_computed_discount := pg_catalog.round((v_computed_subtotal * v_discount_value) / 100.0)::pg_catalog.int8;
  ELSIF v_discount_type = 'fixed'::public.quote_discount_type THEN
    IF v_discount_value < 0 OR v_discount_value > v_computed_subtotal THEN
      RAISE EXCEPTION 'Desconto em valor fixo inválido: não pode ser negativo ou superior ao subtotal.';
    END IF;
    v_computed_discount := v_discount_value::pg_catalog.int8;
  ELSE
    v_computed_discount := 0;
  END IF;

  v_computed_total := v_computed_subtotal - v_computed_discount;
  IF v_computed_total < 0 THEN
    v_computed_total := 0;
  END IF;

  -- Validação de Coerência entre Payload e Totais
  IF v_payload_subtotal <> v_computed_subtotal OR v_payload_discount <> v_computed_discount OR v_payload_total <> v_computed_total THEN
    RAISE EXCEPTION 'Inconsistência nos cálculos do orçamento: os totais informados (Subtotal: %, Desconto: %, Total: %) divergem do cálculo canônico (Subtotal: %, Desconto: %, Total: %).',
      v_payload_subtotal, v_payload_discount, v_payload_total, v_computed_subtotal, v_computed_discount, v_computed_total;
  END IF;

  -- 3. Geração Sequencial do Número do Orçamento
  v_quote_number := public.next_quote_number(p_organization_id);

  -- 4. Inserção do Cabeçalho do Orçamento (com Snapshot do Cliente)
  INSERT INTO public.quotes (
    organization_id,
    quote_number,
    current_version,
    status,
    schema_version,
    idempotency_key,
    customer_id,
    customer_name,
    customer_document,
    customer_contact,
    customer_email,
    customer_phone,
    subtotal_cents,
    discount_type,
    discount_value,
    discount_applied_cents,
    discount_reason,
    total_cents,
    down_payment_cents,
    payment_method,
    payment_condition,
    installments_count,
    installments_json,
    production_days,
    internal_notes,
    customer_notes,
    seller_id,
    seller_name,
    commission_rate_percent,
    commission_amount_cents,
    created_by
  ) VALUES (
    p_organization_id,
    v_quote_number,
    1,
    'awaiting_customer'::public.quote_status,
    1,
    p_idempotency_key,
    (p_quote->>'customer_id')::pg_catalog.uuid,
    COALESCE(p_quote->>'customer_name', 'Consumidor Final'),
    p_quote->>'customer_document',
    p_quote->>'customer_contact',
    p_quote->>'customer_email',
    p_quote->>'customer_phone',
    v_computed_subtotal,
    v_discount_type,
    v_discount_value,
    v_computed_discount,
    p_quote->>'discount_reason',
    v_computed_total,
    COALESCE((p_quote->>'down_payment_cents')::pg_catalog.int8, 0),
    COALESCE((p_quote->>'payment_method')::public.payment_method, 'to_be_defined'::public.payment_method),
    COALESCE((p_quote->>'payment_condition')::public.payment_condition, 'to_be_defined'::public.payment_condition),
    COALESCE((p_quote->>'installments_count')::pg_catalog.int4, 1),
    COALESCE(p_quote->'installments_json', '[]'::pg_catalog.jsonb),
    COALESCE((p_quote->>'production_days')::pg_catalog.int4, 3),
    p_quote->>'internal_notes',
    p_quote->>'customer_notes',
    (p_quote->>'seller_id')::pg_catalog.uuid,
    p_quote->>'seller_name',
    (p_quote->>'commission_rate_percent')::pg_catalog.numeric,
    (p_quote->>'commission_amount_cents')::pg_catalog.int8,
    v_user_id
  ) RETURNING id INTO v_quote_id;

  -- 5. Inserção dos Itens com Snapshot Congelado
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(
    product_id pg_catalog.uuid,
    product_name pg_catalog.text,
    pricing_mode public.pricing_mode,
    quantity pg_catalog.numeric,
    lot_size pg_catalog.int4,
    billed_quantity pg_catalog.numeric,
    width_mm pg_catalog.numeric,
    height_mm pg_catalog.numeric,
    area_m2 pg_catalog.numeric,
    linear_meters pg_catalog.numeric,
    base_price_cents pg_catalog.int8,
    unit_cost_cents pg_catalog.int8,
    unit_price_cents pg_catalog.int8,
    total_price_cents pg_catalog.int8,
    material_name pg_catalog.text,
    notes pg_catalog.text,
    finishings pg_catalog.jsonb
  ) LOOP
    v_display_order := v_display_order + 1;

    INSERT INTO public.quote_items (
      organization_id,
      quote_id,
      product_id,
      product_name,
      pricing_mode,
      quantity,
      lot_size,
      billed_quantity,
      width_mm,
      height_mm,
      area_m2,
      linear_meters,
      base_price_cents,
      unit_cost_cents,
      unit_price_cents,
      total_price_cents,
      material_name,
      notes,
      display_order
    ) VALUES (
      p_organization_id,
      v_quote_id,
      v_item.product_id,
      COALESCE(v_item.product_name, 'Item Gráfico Personalizado'),
      COALESCE(v_item.pricing_mode, 'UNIT'::public.pricing_mode),
      COALESCE(v_item.quantity, 1),
      v_item.lot_size,
      COALESCE(v_item.billed_quantity, 1),
      v_item.width_mm,
      v_item.height_mm,
      v_item.area_m2,
      v_item.linear_meters,
      COALESCE(v_item.base_price_cents, 0),
      COALESCE(v_item.unit_cost_cents, 0),
      COALESCE(v_item.unit_price_cents, 0),
      COALESCE(v_item.total_price_cents, 0),
      v_item.material_name,
      v_item.notes,
      v_display_order
    ) RETURNING id INTO v_item_id;

    -- Inserção dos Acabamentos do Item (com Snapshot)
    IF v_item.finishings IS NOT NULL AND pg_catalog.jsonb_typeof(v_item.finishings) = 'array' THEN
      v_fin_order := 0;
      FOR v_finishing IN SELECT * FROM pg_catalog.jsonb_to_recordset(v_item.finishings) AS f(
        finishing_id pg_catalog.uuid,
        name pg_catalog.text,
        pricing_basis public.finishing_pricing_basis,
        price_status public.finishing_price_status,
        unit_price_cents pg_catalog.int8,
        billed_quantity pg_catalog.numeric,
        total_price_cents pg_catalog.int8,
        calculation_memory pg_catalog.text,
        is_required pg_catalog.bool,
        is_optional pg_catalog.bool,
        notes pg_catalog.text
      ) LOOP
        v_fin_order := v_fin_order + 1;
        INSERT INTO public.quote_item_finishings (
          organization_id,
          quote_item_id,
          finishing_id,
          name,
          pricing_basis,
          price_status,
          unit_price_cents,
          billed_quantity,
          total_price_cents,
          calculation_memory,
          is_required,
          is_optional,
          notes,
          display_order
        ) VALUES (
          p_organization_id,
          v_item_id,
          v_finishing.finishing_id,
          COALESCE(v_finishing.name, 'Acabamento Técnico'),
          COALESCE(v_finishing.pricing_basis, 'FIXED'::public.finishing_pricing_basis),
          COALESCE(v_finishing.price_status, 'CONFIGURED'::public.finishing_price_status),
          COALESCE(v_finishing.unit_price_cents, 0),
          COALESCE(v_finishing.billed_quantity, 1),
          COALESCE(v_finishing.total_price_cents, 0),
          v_finishing.calculation_memory,
          COALESCE(v_finishing.is_required, false),
          COALESCE(v_finishing.is_optional, true),
          v_finishing.notes,
          v_fin_order
        );
      END LOOP;
    END IF;
  END LOOP;

  -- 6. Registro Inicial no Histórico de Eventos (com pg_catalog.btrim)
  INSERT INTO public.quote_events (
    organization_id,
    quote_id,
    version,
    event_type,
    description,
    user_id,
    user_name,
    metadata_json
  ) VALUES (
    p_organization_id,
    v_quote_id,
    1,
    'QUOTE_CREATED',
    'Orçamento comercial emitido no valor de R$ ' || pg_catalog.btrim(pg_catalog.to_char(v_computed_total / 100.0, '999G999G990D00')) || '.',
    v_user_id,
    v_user_name,
    pg_catalog.jsonb_build_object('quoteNumber', v_quote_number, 'totalCents', v_computed_total)
  );

  RETURN v_quote_id;
END;
$$;

-- =============================================================================
-- 2. APROVAÇÃO COMERCIAL DE ORÇAMENTO (COM PROTEÇÃO DE PERMISSÃO)
-- Status: Candidata para homologação
-- Correção: pg_catalog.btrim para compatibilidade com catálogo interno do PostgreSQL
-- =============================================================================
CREATE OR REPLACE FUNCTION public.approve_quote(
  p_organization_id pg_catalog.uuid,
  p_quote_id pg_catalog.uuid,
  p_notes pg_catalog.text DEFAULT NULL
)
RETURNS pg_catalog.bool
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id pg_catalog.uuid;
  v_user_name pg_catalog.text;
  v_role public.user_role;
  v_current_status public.quote_status;
  v_quote_number pg_catalog.text;
  v_total_cents pg_catalog.int8;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação negada: usuário não autenticado.';
  END IF;

  IF NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Operação negada: usuário não é membro desta organização.';
  END IF;

  v_role := public.get_org_role(p_organization_id);

  -- Balcão (reception) e Viewer não podem aprovar orçamentos
  IF v_role IN ('reception'::public.user_role, 'viewer'::public.user_role) THEN
    RAISE EXCEPTION 'Operação negada: seu perfil de acesso (%) não possui permissão para aprovar orçamentos.', v_role;
  END IF;

  IF NOT public.has_org_permission(p_organization_id, 'quotes', 'approve') THEN
    RAISE EXCEPTION 'Operação negada: usuário sem permissão de aprovação comercial.';
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NULL THEN
    v_user_name := 'Gestor Comercial';
  END IF;

  SELECT status, quote_number, total_cents
    INTO v_current_status, v_quote_number, v_total_cents
    FROM public.quotes
   WHERE id = p_quote_id
     AND organization_id = p_organization_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado.';
  END IF;

  IF v_current_status = 'approved'::public.quote_status THEN
    RETURN true; -- Idempotente se já aprovado
  END IF;

  UPDATE public.quotes
     SET status = 'approved'::public.quote_status,
         approved_at = pg_catalog.timezone('utc', pg_catalog.now()),
         internal_notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(internal_notes || E'\n', '') || p_notes ELSE internal_notes END,
         updated_at = pg_catalog.timezone('utc', pg_catalog.now())
   WHERE id = p_quote_id
     AND organization_id = p_organization_id;

  -- Registro de Evento (com pg_catalog.btrim)
  INSERT INTO public.quote_events (
    organization_id,
    quote_id,
    version,
    event_type,
    description,
    user_id,
    user_name,
    metadata_json
  ) VALUES (
    p_organization_id,
    p_quote_id,
    1,
    'QUOTE_APPROVED',
    'Orçamento comercial formalmente aprovado no valor de R$ ' || pg_catalog.btrim(pg_catalog.to_char(v_total_cents / 100.0, '999G999G990D00')) || '.',
    v_user_id,
    v_user_name,
    pg_catalog.jsonb_build_object('approvedBy', v_user_name, 'notes', p_notes)
  );

  RETURN true;
END;
$$;

-- =============================================================================
-- 3. REAPLICAÇÃO EXPLÍCITA DE PERMISSÕES CONTROLADAS
-- =============================================================================

-- Revoga execução pública e anônima
REVOKE ALL ON FUNCTION public.create_quote_with_items(pg_catalog.uuid, pg_catalog.jsonb, pg_catalog.jsonb, pg_catalog.text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_quote(pg_catalog.uuid, pg_catalog.uuid, pg_catalog.text) FROM PUBLIC, anon;

-- Concede SOMENTE approve_quote para authenticated
GRANT EXECUTE ON FUNCTION public.approve_quote(pg_catalog.uuid, pg_catalog.uuid, pg_catalog.text) TO authenticated;

-- NOTA CRÍTICA DE SEGURANÇA:
-- create_quote_with_items PERMANECE REVOGADA DE 'authenticated'.
-- Nenhuma concessão para authenticated é realizada para create_quote_with_items.
