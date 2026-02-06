#!/usr/bin/env bash
set -euo pipefail

cd /repo

export ALPHACLAW_STATE_DIR="/tmp/alphaclaw-test"
export ALPHACLAW_CONFIG_PATH="${ALPHACLAW_STATE_DIR}/alphaclaw.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${ALPHACLAW_STATE_DIR}/credentials"
mkdir -p "${ALPHACLAW_STATE_DIR}/agents/main/sessions"
echo '{}' >"${ALPHACLAW_CONFIG_PATH}"
echo 'creds' >"${ALPHACLAW_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${ALPHACLAW_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm alphaclaw reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${ALPHACLAW_CONFIG_PATH}"
test ! -d "${ALPHACLAW_STATE_DIR}/credentials"
test ! -d "${ALPHACLAW_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${ALPHACLAW_STATE_DIR}/credentials"
echo '{}' >"${ALPHACLAW_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm alphaclaw uninstall --state --yes --non-interactive

test ! -d "${ALPHACLAW_STATE_DIR}"

echo "OK"
