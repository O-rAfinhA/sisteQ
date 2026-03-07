# Deployment (DigitalOcean) — SisteQ

Este repositório suporta dois caminhos de deploy:

- **Hospedagem Gerenciada (App Platform)**: recomendado para deploy automatizado e gerenciamento simplificado.
- **Droplet + Docker Swarm**: alternativa auto-gerenciada com stack completa (Caddy/DB/observabilidade).

## Opção recomendada: App Platform (Hospedagem Gerenciada)

### Container, portas e rotas

- A aplicação é **Next.js 15** (server + API routes) empacotada em Docker com `output: 'standalone'`.
- A App Platform roteia tráfego HTTP para o **http_port** do componente.
- O container precisa escutar em **0.0.0.0** e na porta informada em `PORT`.

Arquivos relevantes:

- Dockerfile: `Dockerfile`
- Healthcheck: `GET /api/health`
- App spec (App Platform): `.do/app.yaml`

Em `.do/app.yaml`, mantenha consistente:

- `services[0].http_port: 3000`
- `health_check.http_path: /api/health`
- `ingress.rules.match.path.prefix: /`

### Variáveis de ambiente (produção)

Obrigatórias:

- `DATABASE_URL` (PostgreSQL). Para Managed DB da DigitalOcean, use SSL (`sslmode=require`) ou configure `PGSSLMODE=require`.
- `SISTEQ_PROFILE_STORE=pg`
- `SISTEQ_SESSION_SECRET` (forte)

Recomendadas:

- `SISTEQ_JWT_SECRET` (se não definido, usa `SISTEQ_SESSION_SECRET`)
- `PGSSLMODE=require` (quando o banco exigir SSL)

Opcionais (dependem de features):

- `SISTEQ_SUPER_ADMIN_TOKEN`
- `OPENROUTER_API_KEY`
- Verificação de e-mail:
  - `SISTEQ_EMAIL_VERIFICATION_MODE` (`required` | `token` | `disabled`)
    - `required` (padrão): envia e-mail de verificação e bloqueia login até confirmar
    - `token`: não envia e-mail, mas retorna URL de verificação para consumo por outro canal
    - `disabled`: auto-verifica no cadastro (útil para ambientes controlados, staging e desenvolvimento)
  - Envio via SMTP (quando `required`):
    - `SISTEQ_EMAIL_FROM` (ex.: `SisteQ <no-reply@seu-dominio.com>`)
    - `SISTEQ_SMTP_HOST`, `SISTEQ_SMTP_PORT` (ex.: 587), `SISTEQ_SMTP_SECURE` (0/1; padrão: 1 quando porta 465)
    - `SISTEQ_SMTP_USER`, `SISTEQ_SMTP_PASS` (quando autenticação é exigida)
    - `SISTEQ_SMTP_REQUIRE_TLS` (0/1, opcional), `SISTEQ_SMTP_TLS_REJECT_UNAUTHORIZED` (0/1; padrão: 1)
    - `SISTEQ_SMTP_CONN_TIMEOUT_MS`, `SISTEQ_SMTP_GREETING_TIMEOUT_MS`, `SISTEQ_SMTP_SOCKET_TIMEOUT_MS` (opcional)
  - Validação de e-mail:
    - `SISTEQ_EMAIL_DOMAIN_CHECK` (0/1; padrão: 1 em produção, 0 fora de produção)
  - Limites de reenvio:
    - `SISTEQ_EMAIL_RESEND_MAX_PER_HOUR` (padrão: 5)
    - `SISTEQ_EMAIL_RESEND_MAX_PER_DAY` (padrão: 20)
  - Segurança do código de verificação:
    - `SISTEQ_EMAIL_VERIFICATION_PEPPER` (recomendado; string secreta usada no hash do código)
  - Privacidade (LGPD/GDPR):
    - Logs de auditoria não registram token/senha e usam hash do e-mail em eventos de reenvio
- Google OAuth:
  - `SISTEQ_GOOGLE_CLIENT_ID`
  - `SISTEQ_GOOGLE_CLIENT_SECRET`
  - `SISTEQ_GOOGLE_REDIRECT_URI` (se não definido, usa `https://<host>/api/auth/google/callback`)
- Ajustes de pool/retentativas:
  - `SISTEQ_DB_LOGS=1`
  - `PGPOOL_MAX`, `PGPOOL_IDLE_MS`, `PGPOOL_CONN_TIMEOUT_MS`, `PG_TX_RETRIES`

### Banco de dados (serviços dependentes)

- Para App Platform, prefira **Managed PostgreSQL** e injete `DATABASE_URL` na App Platform.
- Garanta que o banco esteja acessível pela App Platform (mesma conta/projeto, regras de rede/VPC quando aplicável).
- Se o banco exigir SSL, use `DATABASE_URL` com `sslmode=require` ou `PGSSLMODE=require`.

### Build e start (Dockerfile)

- O build é feito via `next build` e o runtime usa o bundle `standalone`.
- O start do container executa `node server.js` (gerado pelo Next no build).

### Teste local do container (pré-deploy)

Com Docker instalado:

```bash
docker build -t sisteq:local .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e HOSTNAME=0.0.0.0 \
  -e PORT=3000 \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e SISTEQ_PROFILE_STORE=pg \
  -e PGSSLMODE=require \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require" \
  -e SISTEQ_SESSION_SECRET="troque-por-um-segredo-forte" \
  sisteq:local
curl -fsS http://127.0.0.1:3000/api/health
```

## Alternativa: Droplet + Docker Swarm (auto-gerenciado)

### Arquitetura de produção

- App: Next.js 15 em container Docker
- Banco: PostgreSQL 16 em container Docker
- Proxy/SSL: Caddy
- Observabilidade: Loki + Promtail + Grafana + Prometheus + cAdvisor

### Bootstrap no Droplet (resumo)

- Arquivo de stack: `deploy/stack.yml`
- Workflow de deploy: `.github/workflows/deploy.yml`

## CI/CD e validações

- CI: `.github/workflows/ci.yml` valida lint/typecheck/test/build e faz smoke-test do container com `GET /api/health`.

## Roles e permissões (RBAC)

Roles:

- `Admin` (Administrador): acesso total às áreas administrativas.
- `User` (Usuário): acesso restrito às áreas comuns.

Regras relevantes no perfil:

- Somente `Admin` pode ver e acessar as abas **Preferências**, **Notificações** e **Privacidade** em `/perfil`.
- Somente `Admin` vê as entradas correspondentes nos menus de perfil (ex.: **Configurações**).
- O backend bloqueia tentativas de acesso não autorizado com **403** e mensagem `Acesso restrito ao Administrador`.

Endpoints protegidos (somente `Admin`):

- `GET/PUT /api/profile/preferences`
- `GET /api/profile/notifications`
- `GET/PUT /api/profile/notifications/settings`
- `POST /api/profile/notifications/read`
- `GET/PUT /api/profile/privacy`

## Checklist pré-deploy (App Platform)

- Validar `.do/app.yaml`:
  - `repo` aponta para o repositório correto
  - `http_port` e `PORT` batem com o servidor (padrão deste projeto: 3000)
  - `health_check.http_path` está em `/api/health`
  - `ingress.rules` encaminha `prefix: /` para o componente `web`
- Confirmar variáveis obrigatórias na App Platform:
  - `DATABASE_URL` aponta para o Managed PostgreSQL e usa SSL (`sslmode=require`) ou `PGSSLMODE=require`
  - `SISTEQ_PROFILE_STORE=pg`
  - `SISTEQ_SESSION_SECRET` definido e forte
- Validar conectividade com o banco:
  - `GET /api/health` retorna `{ ok: true, db: "ok" }` após o banco estar configurado
- Validar build e runtime do container:
  - `docker build` sem erros
  - `docker run` sobe e responde em `GET /api/health`
