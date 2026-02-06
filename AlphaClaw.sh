#!/usr/bin/env bash
set -euo pipefail

IMAGE="alphaclaw:local"
CONTAINER="alphaclaw"
PORT="${ALPHACLAW_GATEWAY_PORT:-8888}"
DATA_DIR="${ALPHACLAW_CONFIG_DIR:-$HOME/.alphaclaw}"

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Build image if it doesn't exist
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Building $IMAGE..."
  docker build -t "$IMAGE" .
fi

# Stop and remove existing container if running
if docker container inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Stopping existing $CONTAINER container..."
  docker rm -f "$CONTAINER" >/dev/null
fi

# Load .env file if present
ENV_ARGS=()
if [ -f .env ]; then
  ENV_ARGS+=(--env-file .env)
fi

echo "Starting AlphaClaw on port $PORT..."
echo "Config directory: $DATA_DIR"

docker run -d \
  --name "$CONTAINER" \
  -p "$PORT:$PORT" \
  -v "$DATA_DIR:/home/node/.alphaclaw" \
  "${ENV_ARGS[@]}" \
  --restart unless-stopped \
  "$IMAGE" \
  node dist/index.js gateway --bind lan --port "$PORT"

echo ""
echo "AlphaClaw is running."
echo "  Web UI: http://localhost:$PORT"
echo "  Logs:   docker logs -f $CONTAINER"
echo "  Stop:   docker stop $CONTAINER"
