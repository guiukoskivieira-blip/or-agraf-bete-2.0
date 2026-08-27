-- =============================================================================
-- Migration: 0009_lock_create_quote_rpc.sql
-- Description: Bloqueio estrito de execução de create_quote_with_items
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- =============================================================================
-- BLOQUEIO DE PRODUÇÃO: create_quote_with_items
--
-- Justificativa Técnica e de Segurança:
-- 1. A função public.create_quote_with_items está BLOQUEADA PARA PRODUÇÃO.
-- 2. O motor comercial completo (recalculo determinístico de fórmulas UNIT, LOT,
--    SQUARE_METER, LINEAR_METER e acabamentos dinâmicos) ainda não está espelhado
--    e homologado com integridade matemática integral no servidor.
-- 3. Nenhuma chamada RPC direta a partir do frontend web (ou qualquer cliente) é permitida.
-- 4. A liberação futura desta função para clientes autenticados exigirá migration
--    explícita, espelhamento completo de fórmulas comerciais e suíte própria de testes.
-- =============================================================================

-- Revoga explicitamente todos os privilégios de execução de PUBLIC, anon e authenticated
REVOKE ALL ON FUNCTION public.create_quote_with_items(
  pg_catalog.uuid,
  pg_catalog.jsonb,
  pg_catalog.jsonb,
  pg_catalog.text
) FROM PUBLIC, anon, authenticated;

-- Garante que approve_quote mantenha permissão estritamente controlada
REVOKE ALL ON FUNCTION public.approve_quote(
  pg_catalog.uuid,
  pg_catalog.uuid,
  pg_catalog.text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_quote(
  pg_catalog.uuid,
  pg_catalog.uuid,
  pg_catalog.text
) TO authenticated;
