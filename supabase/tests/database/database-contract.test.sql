-- =============================================================================
-- Test Suite: database-contract.test.sql
-- Description: Suíte de Validação pgTAP para Supabase Test DB (Prexyon-Ready)
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

BEGIN;

-- Garante disponibilidade da extensão pgTAP no ambiente temporário de teste
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Define plano de testes exato (31 asserções pgTAP)
SELECT plan(31);

-- =============================================================================
-- 1. SETUP DE DADOS DE TESTE (EXECUTADO EXCLUSIVAMENTE NA TRANSAÇÃO LOCAL)
-- =============================================================================

-- Criação de usuários mock no schema auth (sem credenciais reais)
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'authenticated', 'authenticated', 'carlos@alphaprint.com.br', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'authenticated', 'authenticated', 'mariana@visualmax.com.br', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('c0000000-0000-0000-0000-000000000003'::uuid, 'authenticated', 'authenticated', 'ana@alphaprint.com.br', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('d0000000-0000-0000-0000-000000000004'::uuid, 'authenticated', 'authenticated', 'visitante@externo.com.br', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('e0000000-0000-0000-0000-000000000005'::uuid, 'authenticated', 'authenticated', 'estranho@externo.com.br', '{"provider":"email","providers":["email"]}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'carlos@alphaprint.com.br', 'Carlos Silva (Owner Alpha)'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'mariana@visualmax.com.br', 'Mariana Souza (Owner Beta)'),
  ('c0000000-0000-0000-0000-000000000003'::uuid, 'ana@alphaprint.com.br', 'Ana Atendente (Reception Alpha)'),
  ('d0000000-0000-0000-0000-000000000004'::uuid, 'visitante@externo.com.br', 'Visitante Consulta (Viewer)'),
  ('e0000000-0000-0000-0000-000000000005'::uuid, 'estranho@externo.com.br', 'Usuário Sem Organização')
ON CONFLICT (id) DO NOTHING;

-- Criação de Organizações com Owner via stored procedure
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
INSERT INTO public.organizations (id, trade_name, corporate_name, document, email, phone, is_active)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'Alpha Print Soluções Gráficas', 'Alpha Print Ltda', '12.345.678/0001-90', 'contato@alphaprint.com.br', '11999990001', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, base_profile, permissions_json, is_active, is_locked)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'owner', 'admin', '{}'::jsonb, true, false)
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.product_subscriptions (organization_id, product_code, status, metadata_json)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'orcagraf', 'pending_configuration', '{"managedBy":"prexyon_portal","tier":"unconfigured"}'::jsonb)
ON CONFLICT (organization_id, product_code) DO NOTHING;

INSERT INTO public.organization_quote_sequences (organization_id, current_year, last_number)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, EXTRACT(YEAR FROM now())::int4, 0)
ON CONFLICT (organization_id) DO NOTHING;

-- Criação da Org Beta
INSERT INTO public.organizations (id, trade_name, corporate_name, document, email, phone, is_active)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'VisualMax Comunicação', 'VisualMax Eireli', '98.765.432/0001-10', 'contato@visualmax.com.br', '11999990002', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, base_profile, permissions_json, is_active, is_locked)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'owner', 'admin', '{}'::jsonb, true, false)
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.product_subscriptions (organization_id, product_code, status, metadata_json)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'orcagraf', 'pending_configuration', '{"managedBy":"prexyon_portal","tier":"unconfigured"}'::jsonb)
ON CONFLICT (organization_id, product_code) DO NOTHING;

-- Associação de múltiplos papéis e membresias
-- Carlos é Owner na Alpha e Viewer na Beta
INSERT INTO public.organization_members (organization_id, user_id, role, base_profile, permissions_json, is_active, is_locked)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'viewer', 'custom', '{}'::jsonb, true, false);

-- Ana é Reception na Alpha
INSERT INTO public.organization_members (organization_id, user_id, role, base_profile, permissions_json, is_active, is_locked)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'c0000000-0000-0000-0000-000000000003'::uuid, 'reception', 'reception', '{}'::jsonb, true, false);

-- Visitante é Viewer na Alpha
INSERT INTO public.organization_members (organization_id, user_id, role, base_profile, permissions_json, is_active, is_locked)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'd0000000-0000-0000-0000-000000000004'::uuid, 'viewer', 'custom', '{}'::jsonb, true, false);

-- Inserção de dados comerciais de teste na Org Alpha
INSERT INTO public.customers (id, organization_id, name, document, type)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Cliente Alpha Teste', '11.222.333/0001-44', 'company');

INSERT INTO public.products (id, organization_id, name, category, pricing_mode, lot_size, sale_price_cents)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Cartão de Visita Teste', 'prints', 'LOT', 1000, 7000);

INSERT INTO public.quotes (
  id, organization_id, quote_number, current_version, status, customer_name, subtotal_cents,
  discount_type, discount_value, discount_applied_cents, total_cents, created_by
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ORC-2026-0001',
  1,
  'awaiting_customer',
  'Cliente Alpha Teste',
  7000,
  'none',
  0,
  0,
  7000,
  'a0000000-0000-0000-0000-000000000001'::uuid
);

INSERT INTO public.quote_events (
  id, organization_id, quote_id, version, event_type, description, user_id, user_name, metadata_json
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  1,
  'QUOTE_CREATED',
  'Orçamento emitido para teste',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Carlos Silva',
  '{}'::jsonb
);

INSERT INTO public.audit_logs (
  organization_id, performed_by_user_id, performed_by_user_name, action_type, description
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Carlos Silva',
  'user_created',
  'Log inicial de auditoria de teste'
);

-- =============================================================================
-- 2. ASSERÇÕES PGTAP DE SEGURANÇA E RLS
-- =============================================================================

-- Asserções 1 a 3: Papel anônimo (anon) não tem acesso de leitura aos dados comerciais
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.sub = '';

SELECT is_empty('SELECT * FROM public.quotes', '1. Papel anon não acessa dados da tabela quotes');
SELECT is_empty('SELECT * FROM public.customers', '2. Papel anon não acessa dados da tabela customers');
SELECT is_empty('SELECT * FROM public.products', '3. Papel anon não acessa dados da tabela products');

-- Asserções 4 a 6: Usuário sem membresia é bloqueado de acessar a organização
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000005';

SELECT is(public.is_org_member('11111111-1111-1111-1111-111111111111'::uuid), false, '4. Usuário não vinculado retorna false em is_org_member(Org Alpha)');
SELECT is(public.is_org_member('22222222-2222-2222-2222-222222222222'::uuid), false, '5. Usuário não vinculado retorna false em is_org_member(Org Beta)');
SELECT is_empty('SELECT * FROM public.quotes WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid', '6. Usuário sem membresia não visualiza orçamentos da Org Alpha via RLS');

-- Asserções 7 e 8: Isolamento estrito entre organizações (Membro Beta não lê dados da Alpha)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000002';

SELECT is_empty('SELECT * FROM public.customers WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid', '7. Membro da Org Beta não visualiza clientes da Org Alpha');
SELECT is_empty('SELECT * FROM public.quotes WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid', '8. Membro da Org Beta não visualiza orçamentos da Org Alpha');

-- Asserções 9 e 10: Mesmo usuário em duas organizações com papéis independentes
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';

SELECT is(public.get_org_role('11111111-1111-1111-1111-111111111111'::uuid), 'owner'::public.user_role, '9. Carlos é owner na Org Alpha');
SELECT is(public.get_org_role('22222222-2222-2222-2222-222222222222'::uuid), 'viewer'::public.user_role, '10. Mesmo usuário Carlos é viewer na Org Beta');

-- Asserções 11 a 13: Perfil Viewer possui apenas permissão de leitura
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000004';

SELECT is(public.has_org_permission('11111111-1111-1111-1111-111111111111'::uuid, 'quotes', 'view'), true, '11. Viewer possui permissão de leitura (view) em quotes');
SELECT is(public.has_org_permission('11111111-1111-1111-1111-111111111111'::uuid, 'quotes', 'create'), false, '12. Viewer não possui permissão de criação (create) em quotes');
SELECT is(public.has_org_permission('11111111-1111-1111-1111-111111111111'::uuid, 'quotes', 'approve'), false, '13. Viewer não possui permissão de aprovação (approve) em quotes');

-- Asserção 14: Perfil Reception é impedido de aprovar orçamentos
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';

SELECT throws_like(
  'SELECT public.approve_quote(''11111111-1111-1111-1111-111111111111''::uuid, ''cccccccc-cccc-cccc-cccc-cccccccccccc''::uuid)',
  '%não possui permissão para aprovar orçamentos%',
  '14. Perfil reception é bloqueado de aprovar orçamentos'
);

-- Asserções 15 a 18: Proteção do último Owner ativo contra DELETE, role update, inativação e bloqueio
RESET ROLE;
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';

SELECT throws_like(
  'DELETE FROM public.organization_members WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid AND user_id = ''a0000000-0000-0000-0000-000000000001''::uuid',
  '%não é permitido excluir o único proprietário%',
  '15. DELETE do último owner ativo é estritamente bloqueado por trigger'
);

SELECT throws_like(
  'UPDATE public.organization_members SET role = ''seller''::public.user_role WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid AND user_id = ''a0000000-0000-0000-0000-000000000001''::uuid',
  '%não é permitido desativar, bloquear ou alterar%',
  '16. Rebaixar papel do último owner ativo é estritamente bloqueado por trigger'
);

SELECT throws_like(
  'UPDATE public.organization_members SET is_active = false WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid AND user_id = ''a0000000-0000-0000-0000-000000000001''::uuid',
  '%não é permitido desativar, bloquear ou alterar%',
  '17. Desativar (is_active = false) o último owner ativo é bloqueado por trigger'
);

SELECT throws_like(
  'UPDATE public.organization_members SET is_locked = true WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid AND user_id = ''a0000000-0000-0000-0000-000000000001''::uuid',
  '%não é permitido desativar, bloquear ou alterar%',
  '18. Bloquear (is_locked = true) o último owner ativo é bloqueado por trigger'
);

-- Asserção 19: Documento duplicado de cliente na mesma organização é recusado
SELECT throws_ok(
  'INSERT INTO public.customers (organization_id, name, document, type) VALUES (''11111111-1111-1111-1111-111111111111''::uuid, ''Cliente Duplicado'', ''11.222.333/0001-44'', ''company'')',
  '23505',
  NULL,
  '19. Documento duplicado na mesma organização é rejeitado por constraint de unicidade'
);

-- Asserção 20: Mesmo documento de cliente é permitido em organização diferente
SELECT lives_ok(
  'INSERT INTO public.customers (organization_id, name, document, type) VALUES (''22222222-2222-2222-2222-222222222222''::uuid, ''Cliente Org Beta'', ''11.222.333/0001-44'', ''company'')',
  '20. Mesmo documento de cliente é permitido em organização diferente (isolamento de catálogo)'
);

-- Asserções 21 e 22: Sequência transacional de orçamentos segue formato ORC-YYYY-XXXX sem duplicar
SELECT is(
  public.next_quote_number('11111111-1111-1111-1111-111111111111'::uuid),
  'ORC-' || EXTRACT(YEAR FROM now())::text || '-0001',
  '21. Primeiro número gerado segue formato ORC-YYYY-0001'
);

SELECT is(
  public.next_quote_number('11111111-1111-1111-1111-111111111111'::uuid),
  'ORC-' || EXTRACT(YEAR FROM now())::text || '-0002',
  '22. Segundo número gerado avança atomicamente para ORC-YYYY-0002'
);

-- Asserções 23 a 26: quote_events e audit_logs são append-only (bloqueiam UPDATE e DELETE)
SELECT throws_like(
  'UPDATE public.quote_events SET description = ''Adulterado'' WHERE quote_id = ''cccccccc-cccc-cccc-cccc-cccccccccccc''::uuid',
  '%append-only%',
  '23. UPDATE na tabela quote_events é estritamente bloqueado por trigger'
);

SELECT throws_like(
  'DELETE FROM public.quote_events WHERE quote_id = ''cccccccc-cccc-cccc-cccc-cccccccccccc''::uuid',
  '%append-only%',
  '24. DELETE na tabela quote_events é estritamente bloqueado por trigger'
);

SELECT throws_like(
  'UPDATE public.audit_logs SET description = ''Adulterado'' WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid',
  '%append-only%',
  '25. UPDATE na tabela audit_logs é estritamente bloqueado por trigger'
);

SELECT throws_like(
  'DELETE FROM public.audit_logs WHERE organization_id = ''11111111-1111-1111-1111-111111111111''::uuid',
  '%append-only%',
  '26. DELETE na tabela audit_logs é estritamente bloqueado por trigger'
);

-- Asserções 27 e 28: create_quote_with_items NÃO possui EXECUTE para authenticated nem anon
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'authenticated',
    'public.create_quote_with_items(uuid,jsonb,jsonb,text)',
    'EXECUTE'
  ),
  '27. create_quote_with_items NÃO possui EXECUTE para authenticated'
);

SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.create_quote_with_items(uuid,jsonb,jsonb,text)',
    'EXECUTE'
  ),
  '28. create_quote_with_items NÃO possui EXECUTE para anon'
);

-- Asserções 29 e 30: approve_quote possui EXECUTE para authenticated e NÃO para anon
SELECT ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.approve_quote(uuid,uuid,text)',
    'EXECUTE'
  ),
  '29. approve_quote possui permissão EXECUTE para authenticated'
);

SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.approve_quote(uuid,uuid,text)',
    'EXECUTE'
  ),
  '30. approve_quote NÃO possui permissão EXECUTE para anon'
);

-- Asserção 31: Assinatura de produto foi criada como pending_configuration (sem trial/active fictício)
SELECT is(
  (SELECT status FROM public.product_subscriptions WHERE organization_id = '11111111-1111-1111-1111-111111111111'::uuid AND product_code = 'orcagraf'),
  'pending_configuration'::public.subscription_status,
  '31. Contrato de assinatura inicial é pending_configuration e não cria trial/active fictício'
);

-- =============================================================================
-- FINALIZAÇÃO E LIMPEZA TRANSACIONAL
-- =============================================================================
SELECT * FROM finish();
ROLLBACK;
