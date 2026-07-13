#!/usr/bin/env bash
# Endemigo backend deploy — tek komut.
#   bash scripts/deploy-backend.sh            # rsync + migration + build + restart
#   bash scripts/deploy-backend.sh --no-migrate   # migration'ı atla
#   SSH_HOST=endemigo-dev bash scripts/deploy-backend.sh
#
# Sunucu git repo DEĞİL; kaynak /opt/endemigo-app'e rsync'lenir, image
# /opt/endemigo-infra compose ile rebuild edilir. Build-önce yaklaşımı:
# build başarısız olursa eski container çalışmaya devam eder (kesinti yok).
set -euo pipefail

SSH_HOST="${SSH_HOST:-endemigo-dev}"
APP_DIR="/opt/endemigo-app"
INFRA_DIR="/opt/endemigo-infra"
RUN_MIGRATE=1
[[ "${1:-}" == "--no-migrate" ]] && RUN_MIGRATE=0

# Repo kökü (script nerede olursa olsun)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RSYNC_EXCLUDES=(--exclude node_modules --exclude dist --exclude .git --exclude '*.log' --exclude .env)

echo "==> 1/5 rsync backend + shared-types -> $SSH_HOST:$APP_DIR"
rsync -az "${RSYNC_EXCLUDES[@]}" backend/       "$SSH_HOST:$APP_DIR/backend/"
rsync -az "${RSYNC_EXCLUDES[@]}" shared-types/  "$SSH_HOST:$APP_DIR/shared-types/"

echo "==> 2/5 image build (backend + migrate)"
# migrate image'ı da rebuild et: `compose run` mevcut image'ı yeniden
# BUILD ETMEZ, yani eski cache'li migrate imajı yeni migration dosyalarını
# görmez ("No migrations are pending" hatası). Build-önce: patlarsa restart yok.
ssh "$SSH_HOST" "cd $INFRA_DIR && docker compose --profile tools build backend migrate"

if [[ "$RUN_MIGRATE" == "1" ]]; then
  echo "==> 3/5 pending migration'ları çalıştır"
  ssh "$SSH_HOST" "cd $INFRA_DIR && docker compose --profile tools run --rm migrate"
else
  echo "==> 3/5 migration atlandı (--no-migrate)"
fi

echo "==> 4/5 container restart"
ssh "$SSH_HOST" "cd $INFRA_DIR && docker compose up -d backend"

echo "==> 5/5 sağlık kontrolü"
sleep 6
ssh "$SSH_HOST" "docker ps --filter name=endemigo-backend --format '{{.Names}} {{.Status}}'"
code=$(curl -s -o /dev/null -w '%{http_code}' https://213-238-168-87.sslip.io/auctions/events || echo 000)
echo "auctions/events -> $code"
[[ "$code" == "200" ]] && echo "✅ deploy tamam" || { echo "⚠️  sağlık kontrolü beklenen 200 değil ($code) — logları kontrol et"; exit 1; }
