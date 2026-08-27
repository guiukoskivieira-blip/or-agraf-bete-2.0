/**
 * @file auth.test.ts
 * @description Suíte de Testes de Autenticação Real Supabase (Fase 2A) e Fallback Standalone
 * @project OrçaGraf
 */

import fs from 'fs';
import path from 'path';
import { getSupabaseConfig, getSupabaseClient, resetSupabaseClient } from '../services/supabase-client';
import { TestResult } from './domain-integrity.test';

export function runAuthFoundationTests(): TestResult[] {
  const results: TestResult[] = [];
  const assert = (condition: boolean, testName: string, error?: string) =>
    results.push({
      suiteName: 'Autenticação Real Supabase (Fase 2A)',
      testName,
      passed: condition,
      error: condition ? undefined : error || 'Assertion failed',
    });

  // 1. Ausência de variáveis mantém standalone
  const defaultCfg = getSupabaseConfig({});
  assert(
    defaultCfg.isModeConnected === false && defaultCfg.isConfigured === false,
    '1. Ausência de variáveis de ambiente mantém o modo standalone ativo por padrão'
  );

  // 2. Configuração incompleta não cria cliente Supabase
  resetSupabaseClient();
  const incompleteClient = getSupabaseClient({
    VITE_PREXYON_MODE: 'connected',
    VITE_SUPABASE_URL: 'https://seu-projeto.supabase.co',
    // Falta a publishable/anon key
  });
  assert(
    incompleteClient === null,
    '2. Configuração incompleta (URL sem publishable key) não instancia o cliente Supabase'
  );

  const invalidUrlClient = getSupabaseClient({
    VITE_PREXYON_MODE: 'connected',
    VITE_SUPABASE_URL: 'not-a-valid-url',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_test_key',
  });
  assert(
    invalidUrlClient === null,
    '2.1. URL inválida impede a criação do cliente Supabase'
  );

  // 3. Nenhuma chave secreta existe em src/
  const srcDir = path.join(process.cwd(), 'src');
  const scanSecretsInDir = (dir: string): string[] => {
    const findings: string[] = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        findings.push(...scanSecretsInDir(fullPath));
      } else if (
        (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js')) &&
        file.name !== 'auth.test.ts'
      ) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('service_role')) {
          findings.push(`service_role em ${file.name}`);
        }
        if (content.includes('sb_secret') || /eyJhbGciOi[a-zA-Z0-9_-]{20,}/.test(content)) {
          findings.push(`Token Supabase hardcoded em ${file.name}`);
        }
      }
    }
    return findings;
  };
  const secretFindings = scanSecretsInDir(srcDir);
  assert(
    secretFindings.length === 0,
    '3. Nenhuma chave secreta (service_role, sb_secret, token real) existe no código fonte em src/',
    secretFindings.join(', ')
  );

  // 4. Modo conectado sem sessão requer autenticação (isModeConnected = true)
  const connectedCfg = getSupabaseConfig({
    VITE_PREXYON_MODE: 'connected',
    VITE_SUPABASE_URL: 'https://exemplo-valido.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_pub_valid_key_123',
  });
  assert(
    connectedCfg.isModeConnected === true && connectedCfg.isConfigured === true,
    '4. Modo conectado com variáveis válidas ativa o guard de autenticação'
  );

  // 5. Modo standalone não exige login
  const standaloneCfg = getSupabaseConfig({
    VITE_PREXYON_MODE: 'standalone',
  });
  assert(
    standaloneCfg.isModeConnected === false,
    '5. Modo standalone não exige login e não bloqueia a interface'
  );

  // 6. Loading de sessão e contrato de AuthContext
  const authContextFile = fs.readFileSync(path.join(srcDir, 'context', 'AuthContext.tsx'), 'utf-8');
  assert(
    authContextFile.includes('.getSession()') &&
    authContextFile.includes('loading') &&
    authContextFile.includes('onAuthStateChange'),
    '6. AuthContext gerencia loading de sessão e escuta onAuthStateChange'
  );

  // 7. Login chama signInWithPassword
  assert(
    authContextFile.includes('signInWithPassword') &&
    authContextFile.includes('email: email.trim().toLowerCase()'),
    '7. AuthContext invoca signInWithPassword com credenciais fornecidas'
  );

  // 8. Logout encerra sessão
  assert(
    authContextFile.includes('supabase.auth.signOut()'),
    '8. AuthContext encerra sessão via supabase.auth.signOut()'
  );

  // 9. Recuperação não revela existência do e-mail
  const forgotPageFile = fs.readFileSync(path.join(srcDir, 'pages', 'auth', 'ForgotPasswordPage.tsx'), 'utf-8');
  assert(
    forgotPageFile.includes('setSubmitted(true)') &&
    forgotPageFile.includes('Se o endereço informado estiver cadastrado no sistema'),
    '9. Recuperação de senha exibe mensagem genérica que não revela se o e-mail existe'
  );

  // 10. Listener de autenticação é removido no unmount
  assert(
    authContextFile.includes('subscription.unsubscribe()'),
    '10. Listener onAuthStateChange possui cleanup de subscription no unmount'
  );

  // 11. Cadastro público não existe
  const loginPageFile = fs.readFileSync(path.join(srcDir, 'pages', 'auth', 'LoginPage.tsx'), 'utf-8');
  assert(
    !loginPageFile.includes('Criar conta') &&
    !loginPageFile.includes('Cadastre-se') &&
    loginPageFile.includes('Acesso restrito a usuários autorizados'),
    '11. Tela de login não disponibiliza cadastro público livre (acesso controlado)'
  );

  // 12. create_quote_with_items não é chamado pelo frontend
  const checkNoCreateQuoteRpc = (dir: string): boolean => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (!checkNoCreateQuoteRpc(fullPath)) return false;
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes("rpc('create_quote_with_items'") || content.includes('create_quote_with_items(')) {
          if (!fullPath.includes('auth.test.ts')) {
            return false;
          }
        }
      }
    }
    return true;
  };
  assert(
    checkNoCreateQuoteRpc(srcDir),
    '12. Nenhuma chamada RPC à função create_quote_with_items existe no frontend'
  );

  // 13. Dados comerciais continuam locais no modo standalone
  const commercialContextFile = fs.readFileSync(path.join(srcDir, 'context', 'CommercialContext.tsx'), 'utf-8');
  assert(
    !commercialContextFile.includes(".from('quotes')") &&
    !commercialContextFile.includes(".from('products')") &&
    !commercialContextFile.includes(".from('customers')"),
    '13. Dados comerciais de orçamentos, produtos e clientes continuam desacoplados do banco remoto'
  );

  return results;
}
