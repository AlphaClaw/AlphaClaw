#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${ALPHACLAW_IMAGE:-${ALPHACLAW_IMAGE:-alphaclaw:local}}"
CONFIG_DIR="${ALPHACLAW_CONFIG_DIR:-${ALPHACLAW_CONFIG_DIR:-$HOME/.alphaclaw}}"
WORKSPACE_DIR="${ALPHACLAW_WORKSPACE_DIR:-${ALPHACLAW_WORKSPACE_DIR:-$HOME/.alphaclaw/workspace}}"
PROFILE_FILE="${ALPHACLAW_PROFILE_FILE:-${ALPHACLAW_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run gateway live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e ALPHACLAW_LIVE_TEST=1 \
  -e ALPHACLAW_LIVE_GATEWAY_MODELS="${ALPHACLAW_LIVE_GATEWAY_MODELS:-${ALPHACLAW_LIVE_GATEWAY_MODELS:-all}}" \
  -e ALPHACLAW_LIVE_GATEWAY_PROVIDERS="${ALPHACLAW_LIVE_GATEWAY_PROVIDERS:-${ALPHACLAW_LIVE_GATEWAY_PROVIDERS:-}}" \
  -e ALPHACLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS="${ALPHACLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-${ALPHACLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-}}" \
  -v "$CONFIG_DIR":/home/node/.alphaclaw \
  -v "$WORKSPACE_DIR":/home/node/.alphaclaw/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"
