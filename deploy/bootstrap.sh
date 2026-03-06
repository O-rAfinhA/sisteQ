#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/sisteq}"

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
fi

if ! groups "${USER}" | grep -q docker; then
  sudo usermod -aG docker "${USER}" || true
fi

sudo mkdir -p "${DEPLOY_PATH}"
sudo chown -R "${USER}:${USER}" "${DEPLOY_PATH}"

sudo ufw allow OpenSSH || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

echo "OK: coloque o repositório e o arquivo .env em ${DEPLOY_PATH} e rode docker compose up -d"
