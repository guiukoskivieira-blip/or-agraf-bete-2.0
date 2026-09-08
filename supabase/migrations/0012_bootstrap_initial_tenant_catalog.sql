-- =============================================================================
-- Migration: 0012_bootstrap_initial_tenant_catalog.sql
-- Description: Bootstrap Inicial de Catálogo Comercial (10 Produtos, 10 Acabamentos, 10 Insumos)
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Adicionar marcador explícito autoritativo na tabela organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS catalog_bootstrapped_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_bootstrapped
  ON public.organizations(id, catalog_bootstrapped_at);

-- 2. Função RPC Atômica e Idempotente para Inicialização do Catálogo Comercial do Tenant
CREATE OR REPLACE FUNCTION public.bootstrap_tenant_catalog(p_organization_id pg_catalog.uuid)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id pg_catalog.uuid;
  v_member_id pg_catalog.uuid;
  v_org_id pg_catalog.uuid;
  v_bootstrapped_at pg_catalog.timestamptz;
  v_now pg_catalog.timestamptz;
BEGIN
  -- 1. Validação de Autenticação Estrita
  v_auth_user_id := auth.uid();
  IF (v_auth_user_id IS NULL) THEN
    RAISE EXCEPTION 'Operação negada: usuário não autenticado.'
      USING ERRCODE = 'P0001';
  END IF;

  IF (p_organization_id IS NULL) THEN
    RAISE EXCEPTION 'Identificador de organização inválido.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Validação de Membresia Ativa e Não Bloqueada
  SELECT om.id
    INTO v_member_id
    FROM public.organization_members om
   WHERE om.organization_id = p_organization_id
     AND om.user_id = v_auth_user_id
     AND om.is_active = true
     AND om.is_locked = false;

  IF (v_member_id IS NULL) THEN
    RAISE EXCEPTION 'Operação negada: o usuário autenticado não possui membresia ativa nesta organização.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Validação e Bloqueio Concorrente da Organização (SELECT ... FOR UPDATE)
  SELECT o.id, o.catalog_bootstrapped_at
    INTO v_org_id, v_bootstrapped_at
    FROM public.organizations o
   WHERE o.id = p_organization_id
     AND o.is_active = true
     AND o.deleted_at IS NULL
     FOR UPDATE;

  IF (v_org_id IS NULL) THEN
    RAISE EXCEPTION 'Operação negada: organização não encontrada, inativa ou descontinuada.'
      USING ERRCODE = 'P0003';
  END IF;

  -- 4. Verificação de Idempotência: Se já foi inicializada, retorna NOOP imediatamente
  IF (v_bootstrapped_at IS NOT NULL) THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'NOOP',
      'reason', 'ALREADY_BOOTSTRAPPED',
      'organization_id', p_organization_id,
      'bootstrapped_at', v_bootstrapped_at
    );
  END IF;

  v_now := pg_catalog.timezone('utc', pg_catalog.now());

  -- 5. Inserção dos 10 Produtos Gráficos Iniciais (Sem preços fictícios: has_price_configured = false)
  INSERT INTO public.products (
    organization_id, sku, name, category, short_description, pricing_mode,
    lot_size, calculation_unit, default_width_mm, default_height_mm, default_quantity,
    default_material, default_finishing, production_days, base_cost_cents, markup_percent,
    sale_price_cents, min_sale_price_cents, has_price_configured, is_active,
    internal_notes, created_by, created_at, updated_at
  ) VALUES
    -- 1. Banner em Lona
    (p_organization_id, 'PRD-BAN-01', 'Banner em Lona', 'visual_comm'::public.product_category, 'Banner promocional em lona com impressão digital.', 'SQUARE_METER'::public.pricing_mode, NULL, 'm2'::public.calculation_unit, 1000, 1000, 1, 'Lona 440g', 'Bastão', 2, 0, 0, 0, 0, false, true, 'Item inicial de comunicação visual.', v_auth_user_id, v_now, v_now),
    -- 2. Faixa em Lona
    (p_organization_id, 'PRD-FAI-02', 'Faixa em Lona', 'visual_comm'::public.product_category, 'Faixa informativa ou promocional em lona por metro linear.', 'LINEAR_METER'::public.pricing_mode, NULL, 'linear_meter'::public.calculation_unit, 3000, 600, 1, 'Lona 440g', 'Bastão', 2, 0, 0, 0, 0, false, true, 'Item inicial para faixas.', v_auth_user_id, v_now, v_now),
    -- 3. Adesivo Impresso
    (p_organization_id, 'PRD-ADE-03', 'Adesivo Impresso', 'stickers'::public.product_category, 'Adesivo vinil com impressão digital em alta resolução.', 'SQUARE_METER'::public.pricing_mode, NULL, 'm2'::public.calculation_unit, 1000, 1000, 1, 'Vinil Branco Brilho', 'Refile', 2, 0, 0, 0, 0, false, true, 'Item inicial para adesivos impressos.', v_auth_user_id, v_now, v_now),
    -- 4. Adesivo Recortado
    (p_organization_id, 'PRD-REC-04', 'Adesivo Recortado', 'stickers'::public.product_category, 'Adesivo de recorte eletrônico para vitrines e sinalização.', 'SQUARE_METER'::public.pricing_mode, NULL, 'm2'::public.calculation_unit, 1000, 1000, 1, 'Vinil Branco Brilho', 'Corte Especial', 2, 0, 0, 0, 0, false, true, 'Item inicial para recorte eletrônico.', v_auth_user_id, v_now, v_now),
    -- 5. Placa em PVC
    (p_organization_id, 'PRD-PVC-05', 'Placa em PVC', 'boards_facades'::public.product_category, 'Placa rígida em PVC expandido com aplicação de vinil.', 'SQUARE_METER'::public.pricing_mode, NULL, 'm2'::public.calculation_unit, 1000, 1000, 1, 'PVC 2 mm', 'Corte Reto', 3, 0, 0, 0, 0, false, true, 'Item inicial para placas e painéis.', v_auth_user_id, v_now, v_now),
    -- 6. Placa em PS
    (p_organization_id, 'PRD-PS-06', 'Placa em PS', 'boards_facades'::public.product_category, 'Placa em poliestireno (PS) para sinalização interna.', 'SQUARE_METER'::public.pricing_mode, NULL, 'm2'::public.calculation_unit, 1000, 1000, 1, 'PS 1 mm', 'Corte Reto', 3, 0, 0, 0, 0, false, true, 'Item inicial para sinalização em PS.', v_auth_user_id, v_now, v_now),
    -- 7. Placa em ACM
    (p_organization_id, 'PRD-ACM-07', 'Placa em ACM', 'boards_facades'::public.product_category, 'Painel em alumínio composto para fachadas e placas nobres.', 'SQUARE_METER'::public.pricing_mode, NULL, 'm2'::public.calculation_unit, 1000, 1000, 1, 'ACM 3 mm', 'Corte Reto', 4, 0, 0, 0, 0, false, true, 'Item inicial para fachadas e placas externas.', v_auth_user_id, v_now, v_now),
    -- 8. Cartão de Visita
    (p_organization_id, 'PRD-CRT-08', 'Cartão de Visita', 'prints'::public.product_category, 'Cartão de visita profissional impresso em papel couchê.', 'LOT'::public.pricing_mode, 1000, 'unit'::public.calculation_unit, 90, 50, 1000, 'Papel Couchê', 'Refile', 3, 0, 0, 0, 0, false, true, 'Item inicial para cartões de visita.', v_auth_user_id, v_now, v_now),
    -- 9. Flyer
    (p_organization_id, 'PRD-FLY-09', 'Flyer', 'prints'::public.product_category, 'Folheto promocional ágil para divulgação comercial.', 'LOT'::public.pricing_mode, 1000, 'unit'::public.calculation_unit, 100, 140, 1000, 'Papel Couchê', 'Refile', 3, 0, 0, 0, 0, false, true, 'Item inicial para flyers e panfletos.', v_auth_user_id, v_now, v_now),
    -- 10. Folder
    (p_organization_id, 'PRD-FOL-10', 'Folder', 'prints'::public.product_category, 'Folder institucional ou promocional com dobras.', 'LOT'::public.pricing_mode, 1000, 'unit'::public.calculation_unit, 200, 140, 1000, 'Papel Couchê', 'Dobra', 4, 0, 0, 0, 0, false, true, 'Item inicial para folders com dobra.', v_auth_user_id, v_now, v_now);

  -- 6. Inserção dos 10 Acabamentos Iniciais (Com price_status = 'NOT_CONFIGURED' e price_cents = 0)
  INSERT INTO public.finishings (
    organization_id, name, description, pricing_basis, price_status, price_cents,
    cost_price_cents, sale_price_cents, default_markup_percent, applies_to_all_products,
    is_required, is_default_selected, is_active, notes, created_at, updated_at
  ) VALUES
    ('Ilhós', 'Aplicação de ilhós metálicos nas bordas.', 'PER_UNIT'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Bastão', 'Colocação de bastão de madeira com ponteiras.', 'PER_LINEAR_METER'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Corda', 'Inclusão de corda de nylon para fixação.', 'PER_LINEAR_METER'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Laminação Brilho', 'Película plástica protetora brilhante.', 'PER_SQUARE_METER'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Laminação Fosca', 'Película plástica protetora fosca aveludada.', 'PER_SQUARE_METER'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Corte Reto', 'Esquadrejamento e corte reto nas dimensões finais.', 'FIXED'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Corte Especial', 'Corte com contorno personalizado na fresa ou plotter.', 'PER_UNIT'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Refile', 'Corte de refile e sangria em guilhotina.', 'FIXED'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Dobra', 'Processamento de dobra sanfonada ou paralela.', 'PER_UNIT'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now),
    ('Fita Dupla Face', 'Aplicação de fita dupla face no verso para fixação.', 'PER_LINEAR_METER'::public.finishing_pricing_basis, 'NOT_CONFIGURED'::public.finishing_price_status, 0, 0, 0, 0, false, false, false, true, 'Acabamento inicial.', v_now, v_now)
  ) AS f(name, description, pricing_basis, price_status, price_cents, cost_price_cents, sale_price_cents, default_markup_percent, applies_to_all_products, is_required, is_default_selected, is_active, notes, created_at, updated_at)
  CROSS JOIN (SELECT p_organization_id AS organization_id) org;

  -- 7. Inserção dos 10 Insumos/Materiais Iniciais (Com cost_price_cents = 0)
  INSERT INTO public.materials (
    organization_id, name, category, unit, cost_price_cents, sale_price_cents,
    is_active, notes, created_at, updated_at
  ) VALUES
    ('Lona 440g', 'Lonas', 'm2', 0, 0, true, 'Insumo inicial para banners e faixas.', v_now, v_now),
    ('Vinil Branco Brilho', 'Vinis', 'm2', 0, 0, true, 'Insumo inicial para adesivos.', v_now, v_now),
    ('Vinil Branco Fosco', 'Vinis', 'm2', 0, 0, true, 'Insumo inicial para adesivos foscos.', v_now, v_now),
    ('Vinil Transparente', 'Vinis', 'm2', 0, 0, true, 'Insumo inicial para vitrines e embalagens.', v_now, v_now),
    ('PVC 1 mm', 'Placas', 'm2', 0, 0, true, 'Insumo inicial para placas finas.', v_now, v_now),
    ('PVC 2 mm', 'Placas', 'm2', 0, 0, true, 'Insumo inicial para placas rígidas.', v_now, v_now),
    ('PS 1 mm', 'Placas', 'm2', 0, 0, true, 'Insumo inicial para comunicação visual.', v_now, v_now),
    ('ACM 3 mm', 'Placas', 'm2', 0, 0, true, 'Insumo inicial para fachadas e painéis.', v_now, v_now),
    ('Papel Couchê', 'Papéis', 'sheet', 0, 0, true, 'Insumo inicial para impressos gráficos.', v_now, v_now),
    ('Fita Dupla Face', 'Acessórios', 'linear_meter', 0, 0, true, 'Insumo inicial para fixação.', v_now, v_now)
  ) AS m(name, category, unit, cost_price_cents, sale_price_cents, is_active, notes, created_at, updated_at)
  CROSS JOIN (SELECT p_organization_id AS organization_id) org;

  -- 8. Marcação Atômica do Bootstrap Concluído na Organização
  UPDATE public.organizations
     SET catalog_bootstrapped_at = v_now,
         updated_at = v_now
   WHERE id = p_organization_id;

  -- 9. Retorno com Resumo do Bootstrap Executado
  RETURN pg_catalog.jsonb_build_object(
    'status', 'BOOTSTRAPPED',
    'organization_id', p_organization_id,
    'products_count', 10,
    'finishings_count', 10,
    'materials_count', 10,
    'bootstrapped_at', v_now
  );
END;
$$;

-- 3. Permissões de Execução Segura
REVOKE ALL ON FUNCTION public.bootstrap_tenant_catalog(pg_catalog.uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_tenant_catalog(pg_catalog.uuid) TO authenticated;
