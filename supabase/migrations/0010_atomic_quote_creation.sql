-- =============================================================================
-- Migration: 0010_atomic_quote_creation.sql
-- Description: Criação e Edição Atômica de Orçamentos com Validação de Permissões,
--              Vendedor (Anti-Forjamento de Seller ID), Desconto e Concorrência Otimista
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Criação Atômica de Orçamento Completo com Itens, Acabamentos e Evento
CREATE OR REPLACE FUNCTION public.create_quote_atomic(
  p_organization_id pg_catalog.uuid,
  p_quote pg_catalog.jsonb,
  p_items pg_catalog.jsonb,
  p_idempotency_key pg_catalog.text DEFAULT NULL
)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id pg_catalog.uuid;
  v_user_name pg_catalog.text;
  v_target_seller_id pg_catalog.uuid;
  v_target_seller_name pg_catalog.text;
  v_quote_id pg_catalog.uuid;
  v_quote_number pg_catalog.text;
  v_item_id pg_catalog.uuid;
  v_item RECORD;
  v_fin RECORD;
  v_display_order pg_catalog.int4 := 0;
  v_fin_order pg_catalog.int4 := 0;
  v_existing_quote_id pg_catalog.uuid;
  v_computed_subtotal pg_catalog.int8 := 0;
  v_computed_discount pg_catalog.int8 := 0;
  v_computed_total pg_catalog.int8 := 0;
  v_discount_type public.quote_discount_type;
  v_discount_value pg_catalog.numeric;
BEGIN
  -- Verificação de Autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação negada: usuário não autenticado.';
  END IF;

  -- Verificação de Membresia no Tenant
  IF NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Operação negada: usuário não é membro desta organização.';
  END IF;

  -- Verificação de Permissão de Criação de Orçamentos no Tenant
  IF NOT public.has_org_permission(p_organization_id, 'quotes', 'create') THEN
    RAISE EXCEPTION 'Operação negada: usuário sem permissão para criar orçamentos.';
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NULL THEN
    v_user_name := 'Atendimento Comercial';
  END IF;

  -- Verificação de Idempotência
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id INTO v_existing_quote_id
      FROM public.quotes
     WHERE organization_id = p_organization_id
       AND idempotency_key = p_idempotency_key;

    IF v_existing_quote_id IS NOT NULL THEN
      RETURN pg_catalog.jsonb_build_object(
        'id', v_existing_quote_id,
        'idempotent', true
      );
    END IF;
  END IF;

  -- Validação de Vendedor (Política Anti-Forjamento de Seller ID)
  -- MEMBER comum só pode vincular a si mesmo. Apenas OWNER/ADMIN podem atribuir outro vendedor.
  IF (p_quote->>'seller_id') IS NOT NULL AND (p_quote->>'seller_id') <> '' THEN
    v_target_seller_id := (p_quote->>'seller_id')::pg_catalog.uuid;
    IF v_target_seller_id <> v_user_id THEN
      IF NOT (public.is_org_admin(p_organization_id) OR public.has_org_permission(p_organization_id, 'users_permissions', 'edit')) THEN
        RAISE EXCEPTION 'Operação negada: apenas administradores podem vincular orçamentos a outros vendedores.';
      END IF;
    END IF;
    v_target_seller_name := p_quote->>'seller_name';
  ELSE
    v_target_seller_id := v_user_id;
    v_target_seller_name := v_user_name;
  END IF;

  -- Validação de Itens
  IF p_items IS NULL OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Operação negada: o orçamento deve conter ao menos um item.';
  END IF;

  -- Subtotal dos itens
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(
    total_price_cents pg_catalog.int8
  ) LOOP
    v_computed_subtotal := v_computed_subtotal + COALESCE(v_item.total_price_cents, 0);
  END LOOP;

  -- Validação e Cálculo de Desconto
  v_discount_type := COALESCE((p_quote->>'discount_type')::public.quote_discount_type, 'none'::public.quote_discount_type);
  v_discount_value := COALESCE((p_quote->>'discount_value')::pg_catalog.numeric, 0);

  IF v_discount_type = 'percentage'::public.quote_discount_type THEN
    IF v_discount_value < 0 OR v_discount_value > 100 THEN
      RAISE EXCEPTION 'Desconto percentual inválido: deve estar entre 0%% e 100%%.';
    END IF;
    v_computed_discount := pg_catalog.round((v_computed_subtotal * v_discount_value) / 100.0)::pg_catalog.int8;
  ELSIF v_discount_type = 'fixed'::public.quote_discount_type THEN
    IF v_discount_value < 0 OR v_discount_value > v_computed_subtotal THEN
      RAISE EXCEPTION 'Desconto em valor fixo não pode ser negativo ou superior ao subtotal.';
    END IF;
    v_computed_discount := v_discount_value::pg_catalog.int8;
  ELSE
    v_computed_discount := 0;
  END IF;

  -- Validação de Autorização de Desconto
  IF v_discount_type <> 'none'::public.quote_discount_type AND v_computed_discount > 0 THEN
    IF NOT (public.is_org_admin(p_organization_id) OR public.has_org_permission(p_organization_id, 'quotes', 'apply_discount')) THEN
      RAISE EXCEPTION 'Operação negada: usuário sem permissão para aplicar desconto comercial.';
    END IF;
  END IF;

  v_computed_total := v_computed_subtotal - v_computed_discount;
  IF v_computed_total < 0 THEN
    v_computed_total := 0;
  END IF;

  -- Geração do Número Sequencial Concorrente
  v_quote_number := public.next_quote_number(p_organization_id);

  -- Inserção do Cabeçalho do Orçamento
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
    v_target_seller_id,
    v_target_seller_name,
    (p_quote->>'commission_rate_percent')::pg_catalog.numeric,
    (p_quote->>'commission_amount_cents')::pg_catalog.int8,
    v_user_id
  ) RETURNING id INTO v_quote_id;

  -- Inserção dos Itens e Acabamentos
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(
    product_id pg_catalog.uuid,
    product_name pg_catalog.text,
    pricing_mode public.pricing_mode,
    quantity pg_catalog.int4,
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
      version,
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
      1,
      v_item.product_id,
      v_item.product_name,
      COALESCE(v_item.pricing_mode, 'UNIT'::public.pricing_mode),
      v_item.quantity,
      v_item.lot_size,
      COALESCE(v_item.billed_quantity, v_item.quantity),
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

    -- Inserção dos Acabamentos do Item
    IF v_item.finishings IS NOT NULL AND pg_catalog.jsonb_array_length(v_item.finishings) > 0 THEN
      v_fin_order := 0;
      FOR v_fin IN SELECT * FROM pg_catalog.jsonb_to_recordset(v_item.finishings) AS f(
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
          v_fin.finishing_id,
          v_fin.name,
          COALESCE(v_fin.pricing_basis, 'FIXED'::public.finishing_pricing_basis),
          COALESCE(v_fin.price_status, 'CONFIGURED'::public.finishing_price_status),
          COALESCE(v_fin.unit_price_cents, 0),
          COALESCE(v_fin.billed_quantity, 1),
          COALESCE(v_fin.total_price_cents, 0),
          v_fin.calculation_memory,
          COALESCE(v_fin.is_required, false),
          COALESCE(v_fin.is_optional, true),
          v_fin.notes,
          v_fin_order
        );
      END LOOP;
    END IF;
  END LOOP;

  -- Registro de Evento Inicial
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
    'Orçamento emitido com sucesso',
    v_user_id,
    v_user_name,
    pg_catalog.jsonb_build_object(
      'quote_number', v_quote_number,
      'total_cents', v_computed_total,
      'items_count', v_display_order
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'id', v_quote_id,
    'quote_number', v_quote_number,
    'current_version', 1,
    'subtotal_cents', v_computed_subtotal,
    'discount_applied_cents', v_computed_discount,
    'total_cents', v_computed_total
  );
END;
$$;

-- 2. Atualização Atômica com Concorrência Otimista
CREATE OR REPLACE FUNCTION public.update_quote_atomic(
  p_organization_id pg_catalog.uuid,
  p_quote_id pg_catalog.uuid,
  p_expected_version pg_catalog.int4,
  p_quote pg_catalog.jsonb,
  p_items pg_catalog.jsonb
)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id pg_catalog.uuid;
  v_user_name pg_catalog.text;
  v_current_version pg_catalog.int4;
  v_current_status public.quote_status;
  v_new_version pg_catalog.int4;
  v_target_seller_id pg_catalog.uuid;
  v_target_seller_name pg_catalog.text;
  v_item_id pg_catalog.uuid;
  v_item RECORD;
  v_fin RECORD;
  v_display_order pg_catalog.int4 := 0;
  v_fin_order pg_catalog.int4 := 0;
  v_computed_subtotal pg_catalog.int8 := 0;
  v_computed_discount pg_catalog.int8 := 0;
  v_computed_total pg_catalog.int8 := 0;
  v_discount_type public.quote_discount_type;
  v_discount_value pg_catalog.numeric;
BEGIN
  -- Verificação de Autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação negada: usuário não autenticado.';
  END IF;

  IF NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Operação negada: usuário não é membro desta organização.';
  END IF;

  IF NOT public.has_org_permission(p_organization_id, 'quotes', 'edit') THEN
    RAISE EXCEPTION 'Operação negada: usuário sem permissão para editar orçamentos.';
  END IF;

  -- Concorrência Otimista e Proteção de Status Aprovado
  SELECT current_version, status INTO v_current_version, v_current_status
    FROM public.quotes
   WHERE id = p_quote_id
     AND organization_id = p_organization_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF v_current_version IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado ou já excluído.';
  END IF;

  IF v_current_status = 'approved'::public.quote_status THEN
    RAISE EXCEPTION 'Operação negada: orçamento já aprovado não permite alteração de itens e valores.';
  END IF;

  IF v_current_version <> p_expected_version THEN
    RAISE EXCEPTION 'Conflito de concorrência: o orçamento foi alterado por outro usuário (versão no banco: %, versão esperada: %). Recarregue os dados antes de salvar.',
      v_current_version, p_expected_version;
  END IF;

  v_new_version := v_current_version + 1;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NULL THEN
    v_user_name := 'Atendimento Comercial';
  END IF;

  -- Validação de Vendedor em Edição
  IF (p_quote->>'seller_id') IS NOT NULL AND (p_quote->>'seller_id') <> '' THEN
    v_target_seller_id := (p_quote->>'seller_id')::pg_catalog.uuid;
    IF v_target_seller_id <> v_user_id THEN
      IF NOT (public.is_org_admin(p_organization_id) OR public.has_org_permission(p_organization_id, 'users_permissions', 'edit')) THEN
        RAISE EXCEPTION 'Operação negada: apenas administradores podem transferir orçamentos para outros vendedores.';
      END IF;
    END IF;
    v_target_seller_name := p_quote->>'seller_name';
  END IF;

  -- Recalcula subtotal e descontos
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(
    total_price_cents pg_catalog.int8
  ) LOOP
    v_computed_subtotal := v_computed_subtotal + COALESCE(v_item.total_price_cents, 0);
  END LOOP;

  v_discount_type := COALESCE((p_quote->>'discount_type')::public.quote_discount_type, 'none'::public.quote_discount_type);
  v_discount_value := COALESCE((p_quote->>'discount_value')::pg_catalog.numeric, 0);

  IF v_discount_type = 'percentage'::public.quote_discount_type THEN
    v_computed_discount := pg_catalog.round((v_computed_subtotal * v_discount_value) / 100.0)::pg_catalog.int8;
  ELSIF v_discount_type = 'fixed'::public.quote_discount_type THEN
    v_computed_discount := v_discount_value::pg_catalog.int8;
  ELSE
    v_computed_discount := 0;
  END IF;

  -- Validação de Autorização de Desconto
  IF v_discount_type <> 'none'::public.quote_discount_type AND v_computed_discount > 0 THEN
    IF NOT (public.is_org_admin(p_organization_id) OR public.has_org_permission(p_organization_id, 'quotes', 'apply_discount')) THEN
      RAISE EXCEPTION 'Operação negada: usuário sem permissão para aplicar desconto comercial.';
    END IF;
  END IF;

  v_computed_total := v_computed_subtotal - v_computed_discount;
  IF v_computed_total < 0 THEN
    v_computed_total := 0;
  END IF;

  -- Atualiza o Orçamento
  UPDATE public.quotes
     SET current_version = v_new_version,
         customer_id = COALESCE((p_quote->>'customer_id')::pg_catalog.uuid, customer_id),
         customer_name = COALESCE(p_quote->>'customer_name', customer_name),
         customer_document = COALESCE(p_quote->>'customer_document', customer_document),
         customer_contact = COALESCE(p_quote->>'customer_contact', customer_contact),
         customer_email = COALESCE(p_quote->>'customer_email', customer_email),
         customer_phone = COALESCE(p_quote->>'customer_phone', customer_phone),
         subtotal_cents = v_computed_subtotal,
         discount_type = v_discount_type,
         discount_value = v_discount_value,
         discount_applied_cents = v_computed_discount,
         discount_reason = COALESCE(p_quote->>'discount_reason', discount_reason),
         total_cents = v_computed_total,
         down_payment_cents = COALESCE((p_quote->>'down_payment_cents')::pg_catalog.int8, down_payment_cents),
         payment_method = COALESCE((p_quote->>'payment_method')::public.payment_method, payment_method),
         payment_condition = COALESCE((p_quote->>'payment_condition')::public.payment_condition, payment_condition),
         installments_count = COALESCE((p_quote->>'installments_count')::pg_catalog.int4, installments_count),
         installments_json = COALESCE(p_quote->'installments_json', installments_json),
         production_days = COALESCE((p_quote->>'production_days')::pg_catalog.int4, production_days),
         internal_notes = COALESCE(p_quote->>'internal_notes', internal_notes),
         customer_notes = COALESCE(p_quote->>'customer_notes', customer_notes),
         seller_id = COALESCE(v_target_seller_id, seller_id),
         seller_name = COALESCE(v_target_seller_name, seller_name),
         updated_at = pg_catalog.now()
   WHERE id = p_quote_id
     AND organization_id = p_organization_id;

  -- Remove itens da versão anterior para recriação com snapshot da nova versão
  DELETE FROM public.quote_items
   WHERE quote_id = p_quote_id
     AND organization_id = p_organization_id;

  -- Reinsere os itens atualizados
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(
    product_id pg_catalog.uuid,
    product_name pg_catalog.text,
    pricing_mode public.pricing_mode,
    quantity pg_catalog.int4,
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
      version,
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
      p_quote_id,
      v_new_version,
      v_item.product_id,
      v_item.product_name,
      COALESCE(v_item.pricing_mode, 'UNIT'::public.pricing_mode),
      v_item.quantity,
      v_item.lot_size,
      COALESCE(v_item.billed_quantity, v_item.quantity),
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

    -- Reinsere acabamentos
    IF v_item.finishings IS NOT NULL AND pg_catalog.jsonb_array_length(v_item.finishings) > 0 THEN
      v_fin_order := 0;
      FOR v_fin IN SELECT * FROM pg_catalog.jsonb_to_recordset(v_item.finishings) AS f(
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
          v_fin.finishing_id,
          v_fin.name,
          COALESCE(v_fin.pricing_basis, 'FIXED'::public.finishing_pricing_basis),
          COALESCE(v_fin.price_status, 'CONFIGURED'::public.finishing_price_status),
          COALESCE(v_fin.unit_price_cents, 0),
          COALESCE(v_fin.billed_quantity, 1),
          COALESCE(v_fin.total_price_cents, 0),
          v_fin.calculation_memory,
          COALESCE(v_fin.is_required, false),
          COALESCE(v_fin.is_optional, true),
          v_fin.notes,
          v_fin_order
        );
      END LOOP;
    END IF;
  END LOOP;

  -- Registro de Evento de Atualização
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
    v_new_version,
    'QUOTE_UPDATED',
    'Orçamento atualizado para a versão ' || v_new_version,
    v_user_id,
    v_user_name,
    pg_catalog.jsonb_build_object(
      'new_version', v_new_version,
      'total_cents', v_computed_total,
      'items_count', v_display_order
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'id', p_quote_id,
    'current_version', v_new_version,
    'subtotal_cents', v_computed_subtotal,
    'discount_applied_cents', v_computed_discount,
    'total_cents', v_computed_total
  );
END;
$$;

-- 3. Permissões de Execução Controladas
REVOKE ALL ON FUNCTION public.create_quote_atomic(pg_catalog.uuid, pg_catalog.jsonb, pg_catalog.jsonb, pg_catalog.text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_quote_atomic(pg_catalog.uuid, pg_catalog.uuid, pg_catalog.int4, pg_catalog.jsonb, pg_catalog.jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_quote_atomic(pg_catalog.uuid, pg_catalog.jsonb, pg_catalog.jsonb, pg_catalog.text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_quote_atomic(pg_catalog.uuid, pg_catalog.uuid, pg_catalog.int4, pg_catalog.jsonb, pg_catalog.jsonb) TO authenticated;
