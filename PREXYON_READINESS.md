# OrçaGraf — preparação para o ecossistema Prexyon

## Estado atual

O OrçaGraf continua sendo um produto completo e independente. A aplicação atual
usa dados demonstrativos em memória; eles não representam autenticação, cobrança
ou isolamento multiempresa de produção.

## Fronteira preparada

- `PrexyonSessionContract`: identidade central, organização e vínculo com tenant.
- `ProductEntitlement`: acesso independente a OrçaGraf, ArteCheck e ArteFlow.
- `PrexyonEventEnvelope`: eventos versionados, correlacionados e idempotentes.
- `PrexyonPlatformService`: bloqueia links e integrações sem entitlement real.
- `VITE_PREXYON_MODE=standalone`: padrão seguro até o portal existir.

## Responsabilidade de cada produto

| Produto | Responsabilidade principal |
| --- | --- |
| OrçaGraf | Catálogo, clientes, formação de preço, orçamento e aprovação comercial |
| ArteCheck | Inspeção técnica, pré-impressão e relatório do arquivo gráfico |
| ArteFlow | Pedido, produção, PCP, financeiro e acompanhamento operacional |

## Fluxo futuro

1. A conta e a organização são autenticadas no portal Prexyon.
2. O portal entrega uma sessão curta com entitlements por produto.
3. O OrçaGraf valida o acesso sem duplicar cadastro de usuário ou plano.
4. A aprovação gera `QUOTE_APPROVED` para o ArteFlow com idempotência.
5. Arquivos anexados podem ser enviados ao ArteCheck por evento, sem misturar o
   motor técnico dentro do OrçaGraf.

## Próximas etapas — não simuladas neste MVP

1. Criar o projeto central de identidade/organizações/assinaturas.
2. Substituir `INITIAL_COMPANIES` e `INITIAL_USERS_MAP` por repositórios de backend.
3. Aplicar isolamento no banco por `organization_id`/`tenant_id` e RLS.
4. Implementar troca segura de sessão entre os produtos.
5. Entregar eventos por outbox/webhook com reprocessamento idempotente.
6. Ativar links do ecossistema somente após URLs e entitlements reais.

Nenhum destes itens deve ser apresentado na interface como ativo antes de haver
backend, autenticação e testes de autorização em produção.
