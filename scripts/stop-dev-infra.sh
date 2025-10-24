#!/usr/bin/env bash
set -euo pipefail

# Change to repo root (this script lives in ./scripts)
ROOT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Allow overriding the compose command (e.g., DOCKER_COMPOSE="docker-compose")
DOCKER_COMPOSE="${DOCKER_COMPOSE:-docker compose}"

# Check if Docker is installed and on PATH
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed or not on PATH."
  exit 1
fi

# Check if Docker Compose v2 is installed and on PATH
if ! $DOCKER_COMPOSE version >/dev/null 2>&1; then
  echo "❌ Docker Compose v2 is required (use 'docker compose', not 'docker-compose')."
  exit 1
fi

echo "🛑 Stopping local infra (docker compose down)…"
set -x
$DOCKER_COMPOSE down
set +x
echo "✅ Done."
