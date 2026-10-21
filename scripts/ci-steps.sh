#!/usr/bin/env bash
# The exact steps CI runs. Used by .github/workflows/ci.yml and by scripts/ci-local.sh.
set -euo pipefail
step() { echo; echo "::group::$*"; }
end() { echo "::endgroup::"; }

step "install"; npm ci; end
step "create test db"
psql "${DATABASE_URL%%\?*}" -tc "SELECT 1 FROM pg_database WHERE datname='veloaudit_test'" | grep -q 1 \
  || psql "${DATABASE_URL%%\?*}" -c "CREATE DATABASE veloaudit_test"
end
step "migrate"; npx prisma migrate deploy; end
step "typecheck"; npm run typecheck; end
step "lint"; npm run lint; end
step "unit + integration tests"; npm test; end
step "build"; npm run build; end
step "playwright browsers"; npx playwright install ${PLAYWRIGHT_INSTALL_FLAGS:---with-deps} chromium; end
step "e2e"
PORT="${CI_PORT:-3100}"
npm start -- -p "$PORT" > /tmp/ci-web.log 2>&1 & WEB=$!
npm run worker > /tmp/ci-worker.log 2>&1 & WORKER=$!
trap 'kill $WEB $WORKER 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -sf "http://localhost:$PORT" >/dev/null && break; sleep 1; done
BASE_URL="http://localhost:$PORT" npm run test:e2e
end
echo "CI steps passed"
