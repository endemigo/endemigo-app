#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

export NODE_ENV="${NODE_ENV:-development}"

cd "${BACKEND_DIR}"

start_with_docker() {
  export DATABASE_URL="${DATABASE_URL:-postgresql://endemigo:endemigo_dev@localhost:5432/endemigo}"
  export REDIS_HOST="${REDIS_HOST:-localhost}"
  export REDIS_PORT="${REDIS_PORT:-6379}"
  export REDIS_PASSWORD="${REDIS_PASSWORD:-redis_dev}"

  echo "Starting Postgres and Redis with docker compose..."
  docker compose up -d postgres redis
}

start_with_brew() {
  echo "Docker not found. Starting local brew services..."
  brew services start postgresql@14 >/dev/null
  brew services start redis >/dev/null
}

if command -v docker >/dev/null 2>&1; then
  start_with_docker
elif command -v brew >/dev/null 2>&1; then
  start_with_brew
else
  echo "Neither docker nor brew is available. Cannot start database services."
  exit 1
fi

echo "Running database migrations..."
npm run migration:run

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Backend is already running on port 3000."
  exit 0
fi

echo "Starting backend in watch mode..."
npm run start:dev
