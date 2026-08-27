# Fundação do Banco de Dados Prexyon-Ready do OrçaGraf

Este diretório contém os scripts de banco de dados, políticas de segurança e contratos SQL versionados para o **OrçaGraf Beta Real**, estruturados e preparados para o futuro portal central **Prexyon**.

---

## 1. Status Geral e Isolamento do Aplicativo

- **Frontend 100% Standalone:** O aplicativo OrçaGraf continua operando em modo local isolado (`localStorage`).
- **Migrations Locais Não Executadas:** As migrations residem exclusivamente neste repositório como código-fonte SQL versionado.
- **Desconexão Total:** Aplicar estas migrations em um banco PostgreSQL no futuro **NÃO** conecta automaticamente o frontend. O frontend só se conectará na Fase 1B após homologação formal.
- **Nenhum Segredo ou Chave de Serviço:** O repositório não contém credenciais, senhas, URLs ou chaves `service_role`.

---

## 2. Estrutura e Ordem de Execução das Migrations

| Ordem | Arquivo | Finalidade |
| :--- | :--- | :--- |
| **01** | `migrations/0001_extensions_and_types.sql` | Extensões (`uuid-ossp`, `pgcrypto`) e ENUMs canônicos de domínio (`user_role`, `pricing_mode`, `subscription_status` com `pending_configuration`, etc.). |
| **02** | `migrations/0002_identity_and_organizations.sql` | Perfis (`profiles`), organizações (`organizations`), membros (`organization_members`), trigger de proteção do último *owner* e contrato de assinatura (`product_subscriptions`). |
| **03** | `migrations/0003_commercial_catalog.sql` | Clientes (`customers`), contatos (`customer_contacts`), produtos (`products`), insumos (`materials`), acabamentos (`finishings`) com constraint de status de preço e compatibilidade N:N (`finishing_product_compatibility`). |
| **04** | `migrations/0004_quotes_and_snapshots.sql` | Sequência concorrente (`organization_quote_sequences`), orçamentos (`quotes`) com validação matemática estrita, itens com snapshot congelado (`quote_items`, `quote_item_finishings`) e eventos append-only (`quote_events`). |
| **05** | `migrations/0005_permissions_and_audit.sql` | Logs de auditoria (`audit_logs`) e funções auxiliares de segurança RBAC (`is_org_member`, `can_view_profile`, `get_org_role`, `has_org_permission`) com `SET search_path = ''` e permissões públicas revogadas. |
| **06** | `migrations/0006_rls_policies.sql` | Habilitação de Row Level Security (RLS) sem recursão e políticas granulares com `USING` e `WITH CHECK` completos. |
| **07** | `migrations/0007_transactional_functions.sql` | Stored Procedures seguras (`SET search_path = ''`) com separação estrita entre funções candidatas a homologação e funções bloqueadas para produção. |

---

## 3. Classificação e Status de Segurança das Funções SQL

Todas as funções `SECURITY DEFINER` utilizam estritamente `SET search_path = ''` e qualificam todas as tabelas, tipos e funções com seus schemas explícitos (`public.`, `pg_catalog.`, `auth.`).

| Função | Status de Segurança | Concessão para `authenticated` | Justificativa |
| :--- | :--- | :--- | :--- |
| `create_organization_with_owner` | **Candidata a Homologação** | Concedida (`GRANT EXECUTE`) | Onboarding atômico, assinaturas preparatórias pendentes (`unconfigured`). |
| `next_quote_number` | **Candidata a Homologação** | Concedida (`GRANT EXECUTE`) | Concorrência segura via `SELECT ... FOR UPDATE`, reinicialização anual. |
| `approve_quote` | **Candidata a Homologação** | Concedida (`GRANT EXECUTE`) | Bloqueio de `reception`/`viewer`, transacional e append-only. |
| `reject_quote` | **Candidata a Homologação** | Concedida (`GRANT EXECUTE`) | Transacional com registro imutável de motivo em eventos. |
| `append_quote_event` | **Candidata a Homologação** | Concedida (`GRANT EXECUTE`) | Inserção append-only com `auth.uid()`. |
| `create_quote_with_items` | **BLOQUEADA PARA PRODUÇÃO** | **REVOGADA** (`REVOKE ALL`) | Somar totais enviados pelo cliente **não equivale a recalcular fórmulas comerciais** (`UNIT`, `LOT`, `SQUARE_METER`, `LINEAR_METER` e acabamentos). Permanece como contrato interno de desenvolvimento até implementação de Edge Function na Fase 1B. |

> [!IMPORTANT]
> **Nenhuma função é considerada homologada ou pronta para produção** antes da execução dos testes em uma instância real de PostgreSQL.

---

## 4. Metodologia de Validação e Honestidade Técnica

1. **Testes do Frontend (Executados em Runtime Local):**
   - Os **225 testes automatizados** do projeto (`npm test`) validam o motor de cálculo React no cliente, componentes, snapshots de PDF, acessibilidade e responsividade.
   - **Eles NÃO executam nem validam sintaxe contra um motor PostgreSQL real.**
2. **Validação Estática das Migrations (Realizada):**
   - 100% das funções `SECURITY DEFINER` possuem `SET search_path = ''`.
   - Nenhuma tabela, tipo ou operador depende de resolução implícita.
   - Nenhuma chave secreta ou privilégio `service_role` foi exposto.
3. **Suíte de Testes SQL (`tests/database-contract.test.sql`):**
   - Especificação declarativa completa contendo 10 blocos de asserção para execução em transação com `ROLLBACK`.
   - **Status de Execução:** Escrita e estaticamente validada; execução real ocorrerá na Fase 1B.

---

## 5. Diretrizes Críticas de Segurança

> [!CAUTION]
> **PROIBIÇÃO DE SERVICE_ROLE NO FRONTEND**
> A chave `service_role` ignora todas as regras de Row Level Security (RLS). **Ela NUNCA deve ser incluída no código do frontend (Vite/React), arquivos `.env` do cliente ou repositórios públicos.** O frontend utiliza exclusivamente a `anon key` com tokens JWT do usuário autenticado (`auth.uid()`).

- **Prevenção de Recursão em RLS:** `profiles` avalia visibilidade via helper `can_view_profile` com caminho fixado.
- **Proteção do Último Owner:** O trigger `trg_protect_last_active_owner` impede `DELETE`, alteração de papel, `is_active = false`, `is_locked = true` e mudança de `organization_id`.
- **Assinaturas Preparatórias:** Não cria assinaturas ativas/trial fictícias; usa `pending_configuration`.

