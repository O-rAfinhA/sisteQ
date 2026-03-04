# Deployment (DigitalOcean) — SisteQ

## Arquitetura de produção

- App: Next.js 15 (server + API routes) em container Docker
- Banco: PostgreSQL 16 em container Docker
- Proxy/SSL: Caddy (Let’s Encrypt automático)
- Backups: pg_dump agendado (diário/semana/mês) para volume dedicado
- Observabilidade:
  - Logs centralizados: Loki + Promtail
  - Visualização: Grafana (subdomínio `grafana`)
- Deploy zero downtime (single-node): Docker Swarm com `update_config: start-first` + 2 réplicas do app

## Requisitos

- Droplet Ubuntu 22.04+ (recomendado: 2 vCPU / 4 GB RAM mínimo)
- Domínio (DNS) apontando para o IP do Droplet
- GitHub repo com Actions habilitado

## Variáveis de ambiente (produção)

Crie um arquivo `.env` no servidor (ex.: `/opt/sisteq/.env`) com:

- `SISTEQ_DOMAIN` (ex.: `app.suaempresa.com`)
- `CADDY_EMAIL` (e-mail para Let’s Encrypt)
- `DATABASE_URL` (ex.: `postgresql://sisteq:senha@postgres:5432/sisteq?sslmode=disable`)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `SISTEQ_PROFILE_STORE=pg`
- `SISTEQ_SESSION_SECRET` (obrigatório, forte)
- `SISTEQ_JWT_SECRET` (recomendado, forte)
- `SISTEQ_SUPER_ADMIN_TOKEN` (se usar rotas administrativas “super”)
- `OPENROUTER_API_KEY` (se usar IA)
- Google OAuth (opcional):
  - `SISTEQ_GOOGLE_CLIENT_ID`
  - `SISTEQ_GOOGLE_CLIENT_SECRET`
  - `SISTEQ_GOOGLE_REDIRECT_URI` (opcional; padrão usa `https://<host>/api/auth/google/callback`)
- Logs/DB tuning (opcional):
  - `SISTEQ_DB_LOGS=1`
  - `PGPOOL_MAX=10`
  - `PGPOOL_IDLE_MS=30000`
  - `PGPOOL_CONN_TIMEOUT_MS=5000`
  - `PG_TX_RETRIES=2`
- Backups (opcional, com defaults):
  - `PG_BACKUP_SCHEDULE=0 3 * * *`
  - `PG_BACKUP_KEEP_DAYS=7`
  - `PG_BACKUP_KEEP_WEEKS=4`
  - `PG_BACKUP_KEEP_MONTHS=6`
- Grafana:
  - `GRAFANA_ADMIN_USER=admin`
  - `GRAFANA_ADMIN_PASSWORD` (obrigatório)

## Bootstrap no Droplet

1) Instale Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

2) Inicialize Swarm (single-node):

```bash
docker swarm init
```

3) Copie o projeto (ou ao menos a pasta `deploy/` + `deploy/stack.yml`) para o servidor.

Recomendação de path:

```bash
sudo mkdir -p /opt/sisteq
sudo chown -R $USER:$USER /opt/sisteq
```

4) Crie `/opt/sisteq/.env` com os valores acima.

5) Suba a stack:

```bash
cd /opt/sisteq
set -a && . ./.env && set +a
export SISTEQ_IMAGE="ghcr.io/<owner>/<repo>:latest"
docker stack deploy -c deploy/stack.yml sisteq --with-registry-auth
```

## DNS, domínio e SSL

Crie registros DNS:

- `A` para `SISTEQ_DOMAIN` → IP do Droplet
- `A` para `grafana.SISTEQ_DOMAIN` → IP do Droplet

O Caddy emite e renova certificados automaticamente (porta 80/443 abertas).

## Firewall e proteção DDoS

- DigitalOcean Cloud Firewall:
  - Allow inbound: 22 (restrito ao seu IP), 80, 443
  - Allow outbound: default
- No servidor (opcional, UFW):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

- DDoS:
  - Use Cloudflare (proxy ativado) na frente do domínio para proteção L7 + cache/CDN
  - DigitalOcean oferece mitigação L3/L4 na infra

## CDN e cache

- Cloudflare recomendado:
  - “Proxied” (laranja) para `SISTEQ_DOMAIN`
  - Cache padrão para assets estáticos (Next já usa cache agressivo em `/_next/static`)
- No Caddy, compressão `zstd/gzip` já habilitada em `deploy/Caddyfile`.

## Backups e restore

- Backups automáticos são gravados no volume `pg_backups`.
- Listar backups no servidor:

```bash
docker volume inspect sisteq_pg_backups
```

- Restore (exemplo com arquivo `.sql.gz`):

```bash
gunzip -c /path/do/backup.sql.gz | docker exec -i $(docker ps -q -f name=sisteq_postgres) psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Recomendação: sincronizar o volume `pg_backups` para um storage externo (ex.: DigitalOcean Spaces) via job/cron do host para offsite.

## Observabilidade (logs centralizados)

- Grafana: `https://grafana.<SISTEQ_DOMAIN>`
- Datasource Loki já provisionado (logs do Docker via Promtail).
- Logs do app são emitidos em JSON no stdout; Caddy também.

## CI/CD (GitHub Actions)

Arquivos:

- CI: `.github/workflows/ci.yml`
- Deploy: `.github/workflows/deploy.yml`

Secrets necessários no GitHub:

- `DO_SSH_HOST` (IP ou hostname do Droplet)
- `DO_SSH_USER` (ex.: `root` ou usuário com Docker)
- `DO_SSH_KEY` (chave privada SSH)
- `DO_DEPLOY_PATH` (ex.: `/opt/sisteq`)
- `GHCR_TOKEN` (PAT com `read:packages` para o `docker login` no servidor)

O deploy publica imagem no GHCR e aplica `docker stack deploy` com rolling update `start-first`.

## Teste de carga (smoke)

Script: `load/k6-smoke.js`

Executar localmente via Docker:

```bash
docker run --rm -i grafana/k6 run -e BASE_URL="https://<SISTEQ_DOMAIN>" - < load/k6-smoke.js
```

## Healthcheck e rollout

- Endpoint: `GET /api/health`
- Swarm só troca instâncias quando o healthcheck passa, reduzindo downtime durante deploy.
