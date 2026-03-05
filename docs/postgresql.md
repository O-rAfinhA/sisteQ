# PostgreSQL no SisteQ

## Visão geral

O sistema passa a persistir o **Planejamento Estratégico** no servidor via PostgreSQL, por tenant, através do endpoint:

- `GET /api/strategic/years`
- `PUT /api/strategic/years`

O frontend continua com cache em `localStorage`, mas a fonte de verdade torna-se o banco.

## Diagrama

```mermaid
flowchart LR
  UI[React/SPA (StrategicContext)] -->|GET/PUT /api/strategic/years| API[Next.js API Routes]
  API -->|requireAuthFromRequest| AUTH[Auth/Profile (cookies)]
  API --> SRV[Strategic Service]
  SRV -->|Pool/Transactions| PG[(PostgreSQL)]
  UI -->|cache| LS[(localStorage)]
```

## Configuração

### Variáveis de ambiente

Configure uma das opções abaixo:

- `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME`
  - ou, alternativamente: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

O pool pode ser ajustado com:

- `PGPOOL_MAX` (padrão: 10)
- `PGPOOL_IDLE_MS` (padrão: 30000)
- `PGPOOL_CONN_TIMEOUT_MS` (padrão: 5000)

Para habilitar logs de operações de banco:

- `SISTEQ_DB_LOGS=1`

### Criação de tabelas

Execute o script [postgres_schema.sql](../db/postgres_schema.sql) no banco.

O serviço também executa `CREATE TABLE IF NOT EXISTS` automaticamente no primeiro uso.

## Persistência e logout

- O frontend envia atualizações do planejamento de forma debounced (800ms) via `PUT /api/strategic/years`.
- Antes do logout, o menu de usuário aguarda a conclusão do último envio pendente, reduzindo risco de perda por navegação imediata.

## Multi-tenancy (isolamento por tenant)

O isolamento é garantido em duas camadas:

- **Servidor (PostgreSQL):** todas as tabelas e queries do Planejamento Estratégico usam `tenant_id` como filtro e/ou chave primária.
- **Cliente (cache local):** o cache em `localStorage` é automaticamente “namespaced” por `tenantId`, evitando que dados de uma empresa sejam lidos ao alternar login.

### Como o tenant é determinado

- **Login e fluxos que dependem de tenant slug:** o cliente envia `x-tenant: <tenantSlug>` para endpoints de autenticação que precisam resolver o tenant (ex.: `/api/auth/login`).
- **Demais requisições autenticadas:** o servidor deriva `tenantId` do cookie de sessão (token) e não aceita `tenantId`/`tenantSlug` do body/query para acessar dados.

### Cache local por tenant

Para impedir vazamento entre empresas via cache local, o sistema instala um shim que aplica escopo por tenant em chaves conhecidas (`STORAGE_KEYS` e chaves com prefixos `sisteq*` e `fornecedores*`).

- O `tenantId` atual é armazenado em `sessionStorage` (`sisteq:tenantId`).
- O shim faz com que `localStorage.setItem('k', v)` grave em `localStorage.setItem('<tenantId>::k', v)` para chaves escopadas.
- Na primeira leitura de uma chave legada (sem prefixo), o shim migra o valor para o escopo do tenant e remove a chave legada.
- No logout, a sessão (`sessionStorage`) é limpa e o shim é removido.

## Logs e auditoria (LGPD)

### Logs de banco

Ative com:

- `SISTEQ_DB_LOGS=1`

Gera logs estruturados (JSON) de operações de leitura/escrita/transações no PostgreSQL, sem registrar tokens/senhas.

### Logs de acesso por tenant

Ative com:

- `SISTEQ_ACCESS_LOGS=1`

Gera logs estruturados (JSON) nos endpoints principais, com `tenantId`, `userId`, método e URL, para rastreabilidade e conformidade.

## Relatório de testes (isolamento)

Os seguintes testes automatizados validam isolamento e não persistência cruzada:

- Cache local (escopo por tenant):
  - [tenantLocalStorageShim.test.ts](../src/app/utils/tenantLocalStorageShim.test.ts)
  - Cenários: escrita/leitura com dois tenants e migração de chave legada.
- API Planejamento Estratégico (PostgreSQL):
  - [strategic.api.test.ts](../src/server/strategic.api.test.ts)
  - Cenários: persistência após logout/login e isolamento entre dois tenants.

Para executar:

- `npm test`

Para testes de integração com PostgreSQL, configure `TEST_DATABASE_URL` (ou `DATABASE_URL`).
