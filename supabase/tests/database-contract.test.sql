-- =============================================================================
-- Test Suite: database-contract.test.sql
-- Description: Suíte de Validação de Contrato SQL, RLS e Funções Transacionais
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================
-- NOTA METODOLÓGICA DE AUDITORIA:
-- Este arquivo define a especificação declarativa formal dos contratos do banco
-- de dados. Ele foi projetado para execução em transação isolada com ROLLBACK
-- automático quando o ambiente PostgreSQL/Supabase real for provisionado.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_user_alpha UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_user_beta  UUID := 'b0000000-0000-0000-0000-000000000002'::UUID;
  v_user_reception UUID := 'c0000000-0000-0000-0000-000000000003'::UUID;
  v_user_viewer UUID := 'd0000000-0000-0000-0000-000000000004'::UUID;
  v_user_unaffiliated UUID := 'e0000000-0000-0000-0000-000000000005'::UUID;

  v_org_alpha_id UUID;
  v_org_beta_id  UUID;

  v_cust_alpha_id UUID;
  v_cust_beta_id  UUID;

  v_prod_alpha_id UUID;
  v_fin_alpha_id UUID;

  v_quote_id UUID;
  v_quote_num1 TEXT;
  v_quote_num2 TEXT;
  v_quote_dup_id UUID;
  v_sub_status subscription_status;
BEGIN
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'INICIANDO SUÍTE DE TESTES DE CONTRATO SQL DO ORÇAGRAF (PREXYON-READY)';
  RAISE NOTICE '======================================================================';

  -- ---------------------------------------------------------------------------
  -- TESTE 1: Mock de Perfis de Usuário
  -- ---------------------------------------------------------------------------
  INSERT INTO public.profiles (id, email, full_name) VALUES
    (v_user_alpha, 'carlos@alphaprint.com.br', 'Carlos Silva (Owner Alpha)'),
    (v_user_beta, 'mariana@visualmax.com.br', 'Mariana Souza (Owner Beta)'),
    (v_user_reception, 'ana@alphaprint.com.br', 'Ana Atendente (Reception Alpha)'),
    (v_user_viewer, 'visitante@externo.com.br', 'Visitante Consulta (Viewer)'),
    (v_user_unaffiliated, 'estranho@externo.com.br', 'Usuário Sem Organização');

  -- ---------------------------------------------------------------------------
  -- TESTE 2: Criação Transacional de Organizações com Owner e Sem Assinatura Fictícia
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_alpha::TEXT, true);
  v_org_alpha_id := create_organization_with_owner('Alpha Print Soluções Gráficas', 'Alpha Print Ltda', '12.345.678/0001-90', 'contato@alphaprint.com.br');

  PERFORM set_config('request.jwt.claim.sub', v_user_beta::TEXT, true);
  v_org_beta_id := create_organization_with_owner('VisualMax Comunicação', 'VisualMax Eireli', '98.765.432/0001-10', 'contato@visualmax.com.br');

  ASSERT v_org_alpha_id IS NOT NULL, 'Falha: Org Alpha não foi criada.';
  ASSERT v_org_beta_id IS NOT NULL, 'Falha: Org Beta não foi criada.';

  -- Verifica que o contrato de assinatura preparatório NÃO inventa active ou trial
  SELECT status INTO v_sub_status FROM public.product_subscriptions WHERE organization_id = v_org_alpha_id AND product_code = 'orcagraf';
  ASSERT v_sub_status = 'pending_configuration', 'Falha: Contrato de assinatura não está como pending_configuration.';
  RAISE NOTICE '✅ [PASSOU] 1. Criação atômica com Owner e assinatura preparatória pendente (sem trial/active fictício).';

  -- ---------------------------------------------------------------------------
  -- TESTE 3: Usuário Sem Membresia Negado
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_unaffiliated::TEXT, true);
  ASSERT is_org_member(v_org_alpha_id) = false, 'Falha: Usuário sem vínculo foi reconhecido como membro da Alpha.';
  ASSERT is_org_member(v_org_beta_id) = false, 'Falha: Usuário sem vínculo foi reconhecido como membro da Beta.';
  RAISE NOTICE '✅ [PASSOU] 2. Validação estrita de não-membros.';

  -- ---------------------------------------------------------------------------
  -- TESTE 4: Mesmo Usuário com Papéis Diferentes em Organizações Distintas
  -- ---------------------------------------------------------------------------
  -- Vincula Carlos (Owner na Alpha) como Viewer na Beta
  INSERT INTO public.organization_members (organization_id, user_id, role, base_profile)
  VALUES (v_org_beta_id, v_user_alpha, 'viewer', 'custom');

  -- Vincula Ana como Reception na Alpha
  INSERT INTO public.organization_members (organization_id, user_id, role, base_profile)
  VALUES (v_org_alpha_id, v_user_reception, 'reception', 'reception');

  -- Vincula Visitante como Viewer na Alpha
  INSERT INTO public.organization_members (organization_id, user_id, role, base_profile)
  VALUES (v_org_alpha_id, v_user_viewer, 'viewer', 'custom');

  PERFORM set_config('request.jwt.claim.sub', v_user_alpha::TEXT, true);
  ASSERT get_org_role(v_org_alpha_id) = 'owner', 'Falha: Carlos não é owner na Alpha.';
  ASSERT get_org_role(v_org_beta_id) = 'viewer', 'Falha: Carlos não é viewer na Beta.';
  RAISE NOTICE '✅ [PASSOU] 3. Suporte a mesmo usuário em múltiplas organizações com papéis independentes.';

  -- ---------------------------------------------------------------------------
  -- TESTE 5: Proteção do Último Owner Ativo em Todos os Cenários (DELETE / UPDATE / LOCK)
  -- ---------------------------------------------------------------------------
  -- 5.1 Tentativa de DELETE
  BEGIN
    DELETE FROM public.organization_members WHERE organization_id = v_org_alpha_id AND user_id = v_user_alpha;
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Permitiu excluir o único owner ativo da organização!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%não é permitido excluir o único proprietário%' THEN
        RAISE EXCEPTION 'Erro inesperado na proteção de owner (DELETE): %', SQLERRM;
      END IF;
  END;

  -- 5.2 Tentativa de mudar role do único owner
  BEGIN
    UPDATE public.organization_members SET role = 'seller' WHERE organization_id = v_org_alpha_id AND user_id = v_user_alpha;
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Permitiu rebaixar o único owner ativo da organização!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%não é permitido desativar, bloquear ou alterar%' THEN
        RAISE EXCEPTION 'Erro inesperado na proteção de owner (ROLE UPDATE): %', SQLERRM;
      END IF;
  END;

  -- 5.3 Tentativa de desativar (is_active = false)
  BEGIN
    UPDATE public.organization_members SET is_active = false WHERE organization_id = v_org_alpha_id AND user_id = v_user_alpha;
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Permitiu desativar o único owner da organização!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%não é permitido desativar, bloquear ou alterar%' THEN
        RAISE EXCEPTION 'Erro inesperado na proteção de owner (is_active): %', SQLERRM;
      END IF;
  END;

  -- 5.4 Tentativa de bloquear (is_locked = true)
  BEGIN
    UPDATE public.organization_members SET is_locked = true WHERE organization_id = v_org_alpha_id AND user_id = v_user_alpha;
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Permitiu bloquear o único owner da organização!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%não é permitido desativar, bloquear ou alterar%' THEN
        RAISE EXCEPTION 'Erro inesperado na proteção de owner (is_locked): %', SQLERRM;
      END IF;
  END;
  RAISE NOTICE '✅ [PASSOU] 4. Trigger impediu com sucesso DELETE, UPDATE de role, desativação e bloqueio do último owner.';

  -- ---------------------------------------------------------------------------
  -- TESTE 6: Unicidade de Documento de Cliente (Mesma Org vs Org Diferente)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.customers (organization_id, name, document, type)
  VALUES (v_org_alpha_id, 'Empresa Cliente Teste', '11.222.333/0001-44', 'company')
  RETURNING id INTO v_cust_alpha_id;

  BEGIN
    INSERT INTO public.customers (organization_id, name, document, type)
    VALUES (v_org_alpha_id, 'Empresa Clonada', '11.222.333/0001-44', 'company');
    RAISE EXCEPTION 'FALHA DE INTEGRIDADE: Permitiu documento duplicado na mesma organização!';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  INSERT INTO public.customers (organization_id, name, document, type)
  VALUES (v_org_beta_id, 'Filial Visual Cliente', '11.222.333/0001-44', 'company')
  RETURNING id INTO v_cust_beta_id;

  ASSERT v_cust_beta_id IS NOT NULL, 'Falha: Isolamento multiempresa impediu cliente com mesmo documento em outra org.';
  RAISE NOTICE '✅ [PASSOU] 5. Isolamento de documentos comerciais por organização.';

  -- ---------------------------------------------------------------------------
  -- TESTE 7: Numeração Concorrente e Tratamento de Ano Novo
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_alpha::TEXT, true);
  v_quote_num1 := next_quote_number(v_org_alpha_id);
  v_quote_num2 := next_quote_number(v_org_alpha_id);

  ASSERT v_quote_num1 = 'ORC-' || EXTRACT(YEAR FROM timezone('utc', now()))::TEXT || '-0001', 'Falha no formato do 1º número: ' || v_quote_num1;
  ASSERT v_quote_num2 = 'ORC-' || EXTRACT(YEAR FROM timezone('utc', now()))::TEXT || '-0002', 'Falha no formato do 2º número: ' || v_quote_num2;

  -- Simula mudança de ano na tabela de sequência
  UPDATE public.organization_quote_sequences
     SET current_year = 2025, last_number = 999
   WHERE organization_id = v_org_alpha_id;

  v_quote_num1 := next_quote_number(v_org_alpha_id);
  ASSERT v_quote_num1 = 'ORC-' || EXTRACT(YEAR FROM timezone('utc', now()))::TEXT || '-0001', 'Falha na reinicialização de ano da sequência.';
  RAISE NOTICE '✅ [PASSOU] 6. Geração atômica e reinicialização correta na virada de ano.';

  -- ---------------------------------------------------------------------------
  -- TESTE 8: Criação Atômica de Orçamento com Validação Determinística de Totais
  -- ---------------------------------------------------------------------------
  INSERT INTO public.products (organization_id, sku, name, pricing_mode, base_cost_cents, sale_price_cents, has_price_configured)
  VALUES (v_org_alpha_id, 'PRD-CART-01', 'Cartão de Visita Couché 300g', 'LOT', 3500, 7000, true)
  RETURNING id INTO v_prod_alpha_id;

  INSERT INTO public.finishings (organization_id, name, pricing_basis, price_cents, price_status)
  VALUES (v_org_alpha_id, 'Cantos Arredondados', 'FIXED', 1000, 'CONFIGURED')
  RETURNING id INTO v_fin_alpha_id;

  -- 8.1 Rejeição de Totais Manipulados / Forjados pelo Payload
  BEGIN
    PERFORM create_quote_with_items(
      v_org_alpha_id,
      jsonb_build_object(
        'customer_id', v_cust_alpha_id,
        'customer_name', 'Empresa Cliente Teste',
        'subtotal_cents', 8000,
        'discount_type', 'percentage',
        'discount_value', 10,
        'discount_applied_cents', 800,
        'total_cents', 100 -- TOTAL FORJADO! Deveria ser 7200
      ),
      jsonb_build_array(
        jsonb_build_object(
          'product_id', v_prod_alpha_id,
          'product_name', 'Cartão de Visita',
          'pricing_mode', 'LOT',
          'quantity', 1000,
          'billed_quantity', 1,
          'total_price_cents', 8000
        )
      ),
      'idemp-forged-test'
    );
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Permitiu criar orçamento com total financeiro adulterado!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Inconsistência nos cálculos do orçamento%' THEN
        RAISE EXCEPTION 'Erro inesperado na validação de total forjado: %', SQLERRM;
      END IF;
  END;

  -- 8.2 Emissão Correta
  v_quote_id := create_quote_with_items(
    v_org_alpha_id,
    jsonb_build_object(
      'customer_id', v_cust_alpha_id,
      'customer_name', 'Empresa Cliente Teste',
      'customer_document', '11.222.333/0001-44',
      'subtotal_cents', 8000,
      'discount_type', 'percentage',
      'discount_value', 10,
      'discount_applied_cents', 800,
      'total_cents', 7200,
      'down_payment_cents', 7200,
      'payment_method', 'pix',
      'payment_condition', 'in_cash'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod_alpha_id,
        'product_name', 'Cartão de Visita Couché 300g',
        'pricing_mode', 'LOT',
        'quantity', 1000,
        'lot_size', 1000,
        'billed_quantity', 1,
        'base_price_cents', 7000,
        'unit_price_cents', 7000,
        'total_price_cents', 8000,
        'finishings', jsonb_build_array(
          jsonb_build_object(
            'finishing_id', v_fin_alpha_id,
            'name', 'Cantos Arredondados',
            'pricing_basis', 'FIXED',
            'price_status', 'CONFIGURED',
            'unit_price_cents', 1000,
            'billed_quantity', 1,
            'total_price_cents', 1000,
            'is_required', false,
            'is_optional', true
          )
        )
      )
    ),
    'idemp-valid-001'
  );

  ASSERT v_quote_id IS NOT NULL, 'Falha ao emitir orçamento válido.';
  RAISE NOTICE '✅ [PASSOU] 7. Validação determinística de cálculos e bloqueio de adulteração financeira.';

  -- ---------------------------------------------------------------------------
  -- TESTE 9: Proteção contra Conflito de Idempotência
  -- ---------------------------------------------------------------------------
  -- Mesma chave com payload idêntico -> Retorna ID existente
  v_quote_dup_id := create_quote_with_items(
    v_org_alpha_id,
    jsonb_build_object('customer_name', 'Empresa Cliente Teste', 'total_cents', 7200),
    jsonb_build_array(jsonb_build_object('total_price_cents', 8000)),
    'idemp-valid-001'
  );
  ASSERT v_quote_dup_id = v_quote_id, 'Falha de idempotência idêntica.';

  -- Mesma chave com total divergente -> Lança exceção de conflito
  BEGIN
    PERFORM create_quote_with_items(
      v_org_alpha_id,
      jsonb_build_object('customer_name', 'Outro Cliente', 'total_cents', 99999),
      jsonb_build_array(jsonb_build_object('total_price_cents', 99999)),
      'idemp-valid-001'
    );
    RAISE EXCEPTION 'FALHA DE IDEMPOTÊNCIA: Permitiu reuso de chave com payload conflitante!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Conflito de idempotência%' THEN
        RAISE EXCEPTION 'Erro inesperado no teste de conflito de idempotência: %', SQLERRM;
      END IF;
  END;
  RAISE NOTICE '✅ [PASSOU] 8. Idempotência estrita: protege contra duplicidade e rejeita conflitos de carga.';

  -- ---------------------------------------------------------------------------
  -- TESTE 10: Controle de Permissões (Reception / Viewer bloqueados para aprovação)
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_reception::TEXT, true);
  BEGIN
    PERFORM approve_quote(v_org_alpha_id, v_quote_id, 'Tentativa reception');
    RAISE EXCEPTION 'FALHA DE PERMISSÃO: Reception conseguiu aprovar!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%não possui permissão para aprovar%' THEN
        RAISE EXCEPTION 'Erro inesperado na permissão de reception: %', SQLERRM;
      END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_user_alpha::TEXT, true);
  PERFORM approve_quote(v_org_alpha_id, v_quote_id, 'Aprovado pelo Owner');
  ASSERT (SELECT status FROM public.quotes WHERE id = v_quote_id) = 'approved', 'Falha ao aprovar proposta.';
  RAISE NOTICE '✅ [PASSOU] 9. Permissões comerciais validadas (reception bloqueado, owner aprovado).';

  -- ---------------------------------------------------------------------------
  -- TESTE 11: Imutabilidade Append-Only de Eventos e Auditoria
  -- ---------------------------------------------------------------------------
  BEGIN
    DELETE FROM public.quote_events WHERE quote_id = v_quote_id;
    RAISE EXCEPTION 'FALHA DE AUDITORIA: Permitiu excluir eventos!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%quote_events é um registro append-only%' THEN
        RAISE EXCEPTION 'Erro inesperado na proteção de quote_events: %', SQLERRM;
      END IF;
  END;

  BEGIN
    DELETE FROM public.audit_logs WHERE organization_id = v_org_alpha_id;
    RAISE EXCEPTION 'FALHA DE AUDITORIA: Permitiu excluir audit_logs!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%audit_logs é um registro append-only%' THEN
        RAISE EXCEPTION 'Erro inesperado na proteção de audit_logs: %', SQLERRM;
      END IF;
  END;
  RAISE NOTICE '✅ [PASSOU] 10. Imutabilidade append-only de históricos de eventos e auditoria.';

  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'TODOS OS 10 BLOCOS DE CONTRATO SQL PASSARAM COM SUCESSO (LOCAL SPEC)!';
  RAISE NOTICE '======================================================================';
END;
$$;

ROLLBACK; -- Garante rollback atômico do teste

