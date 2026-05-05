#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${BACKEND_DIR}"

if command -v docker >/dev/null 2>&1; then
  echo "Stopping Postgres and Redis with docker compose..."
  docker compose down
  exit 0
fi

if command -v brew >/dev/null 2>&1; then
  echo "Docker not found. Stopping local brew services..."
  brew services stop postgresql@14 >/dev/null || true
  brew services stop redis >/dev/null || true
  exit 0
fi

echo "Neither docker nor brew is available. Cannot stop database services."
exit 1
