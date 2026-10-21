#!/usr/bin/env bash
# Simulates the GitHub Actions job on a machine without Docker/act:
# copies the repo to a clean temp dir (like actions/checkout) and runs scripts/ci-steps.sh
# against local Postgres/Redis using a dedicated CI database and queue.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
(cd "$ROOT" && git ls-files -co --exclude-standard -z | tar --null -cf - -T -) | tar -xf - -C "$WORK"
cd "$WORK"
sudo -u postgres psql -qc "DROP DATABASE IF EXISTS veloaudit_ci" -c "CREATE DATABASE veloaudit_ci OWNER velo" >/dev/null
export DATABASE_URL="postgresql://velo:velo@localhost:5432/veloaudit_ci?schema=public"
export TEST_DATABASE_URL="postgresql://velo:velo@localhost:5432/veloaudit_test?schema=public"
export REDIS_URL="redis://localhost:6379"
export CI_PORT=3100 AUDIT_QUEUE_NAME=audits-ci DNS_RESOLVER="${DNS_RESOLVER:-doh}"
export PLAYWRIGHT_INSTALL_FLAGS=""   # browsers/deps already installed locally
rm -f .env                            # CI has no .env; everything comes from the environment
bash scripts/ci-steps.sh
