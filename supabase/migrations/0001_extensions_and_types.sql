-- =============================================================================
-- Migration: 0001_extensions_and_types.sql
-- Description: Extensões PostgreSQL e Tipos Canônicos do Domínio OrçaGraf / Prexyon
-- Project: OrçaGraf (Prexyon-Ready Foundation)
-- =============================================================================

-- 1. Extensões Obrigatórias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Papéis de Usuário no OrçaGraf (Prexyon-Ready)
-- NOTA DE ESCOPO: O papel 'production' não faz parte do OrçaGraf comercial.
CREATE TYPE user_role AS ENUM (
  'owner',      -- Proprietário da organização (Acesso irrestrito)
  'admin',      -- Administrador geral
  'manager',    -- Gestor comercial
  'seller',     -- Vendedor comercial
  'reception',  -- Balcão / Atendimento
  'viewer'      -- Apenas visualização
);

-- 3. Perfis-Base Configuráveis
CREATE TYPE base_profile AS ENUM (
  'admin',
  'reception',
  'sales',
  'manager',
  'custom'
);

-- 4. Contratos de Assinatura e Produtos do Ecossistema Prexyon
CREATE TYPE subscription_product_code AS ENUM (
  'orcagraf',   -- Motor comercial e emissão de propostas
  'arteflow',   -- PCP, fluxo de produção e financeiro operacional
  'artecheck'   -- Pré-impressão técnica e verificação de arquivos
);

CREATE TYPE subscription_status AS ENUM (
  'pending_configuration', -- Estado preparatório (não ativo, aguardando portal Prexyon)
  'trial',                 -- Período de demonstração/teste
  'active',                -- Assinatura ativa e regular
  'past_due',              -- Pendência financeira
  'canceled',              -- Cancelada
  'unsubscribed'           -- Produto não contratado
);

-- 5. Clientes
CREATE TYPE customer_type AS ENUM (
  'person',     -- Pessoa Física (CPF)
  'company'     -- Pessoa Jurídica (CNPJ)
);

-- 6. Catálogo Comercial e Modalidades de Precificação
CREATE TYPE product_category AS ENUM (
  'prints',           -- Impressos (Cartões, flyers, folders)
  'visual_comm',      -- Comunicação visual (Banners, faixas)
  'stickers',         -- Adesivos impressos e de recorte
  'boards_facades',   -- Placas e fachadas (PVC, ACM)
  'signage',          -- Sinalização e totens (Wind banners)
  'custom_services'   -- Serviços especiais sob demanda
);

CREATE TYPE pricing_mode AS ENUM (
  'UNIT',             -- Cobrança por unidade individual (ex: Wind banner, Cardápio)
  'LOT',              -- Cobrança por lote/tiragem (ex: Cartão de visita 1.000 un.)
  'SQUARE_METER',     -- Cobrança por metro quadrado (ex: Banner, Adesivo)
  'LINEAR_METER'      -- Cobrança por metro linear (ex: Faixa em lona)
);

CREATE TYPE calculation_unit AS ENUM (
  'unit',
  'm2',
  'linear_meter',
  'cm2',
  'service',
  'pack'
);

-- 7. Acabamentos Técnicos
CREATE TYPE finishing_pricing_basis AS ENUM (
  'FIXED',            -- Preço fixo por item
  'PER_UNIT',         -- Preço por unidade
  'PER_LOT',          -- Preço por lote
  'PER_SQUARE_METER', -- Preço por m²
  'PER_LINEAR_METER'  -- Preço por metro linear
);

CREATE TYPE finishing_price_status AS ENUM (
  'CONFIGURED',       -- Preço comercialmente definido
  'NOT_CONFIGURED',   -- Preço pendente de configuração comercial
  'FREE'              -- Acabamento expressamente gratuito/incluso
);

-- 8. Orçamentos e Condições Comerciais
CREATE TYPE quote_status AS ENUM (
  'awaiting_customer', -- Aguardando resposta do cliente
  'approved',          -- Aprovado comercialmente
  'rejected'           -- Recusado pelo cliente ou cancelado
);

CREATE TYPE quote_discount_type AS ENUM (
  'none',              -- Sem desconto
  'percentage',        -- Desconto percentual (%)
  'fixed'              -- Desconto em valor fixo monetário (centavos)
);

CREATE TYPE payment_method AS ENUM (
  'pix',
  'cash',
  'debit_card',
  'credit_card',
  'bank_slip',
  'bank_transfer',
  'to_be_defined'
);

CREATE TYPE payment_condition AS ENUM (
  'in_cash',
  'down_payment_and_balance',
  'installments',
  'to_be_defined'
);

-- 9. Auditoria de Segurança
CREATE TYPE audit_action_type AS ENUM (
  'user_created',
  'user_updated',
  'permissions_updated',
  'user_deactivated',
  'user_activated',
  'session_terminated'
);
