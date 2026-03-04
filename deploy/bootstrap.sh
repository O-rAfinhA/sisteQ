#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/sisteq}"

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
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

docker swarm init 2>/dev/null || true

echo "OK: coloque deploy/ e o arquivo .env em ${DEPLOY_PATH} e rode docker stack deploy"
