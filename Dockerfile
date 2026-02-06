# Build context: monorepo root
# Usage: docker build -t alphaclaw:local .

# ── Stage 1: Install deps + build ────────────────────────────────────
FROM node:22-bookworm AS builder

# Install Bun (build scripts need both node and bun)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json bun.lock bunfig.toml ./
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json

# Install all workspace deps
RUN bun install

# Copy the full source tree
COPY . .

# Build AlphaClaw + UI
RUN ALPHACLAW_A2UI_SKIP_MISSING=1 bun run --cwd packages/core build
RUN bun run --cwd packages/ui build

# ── Stage 2: Production runtime ──────────────────────────────────────
# Preserve monorepo layout so Node resolves hoisted node_modules at /app/node_modules
FROM node:22-slim

WORKDIR /app

# Hoisted monorepo deps (most packages resolve from here)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# AlphaClaw package
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/alphaclaw.mjs ./packages/core/alphaclaw.mjs
COPY --from=builder /app/packages/core/assets ./packages/core/assets
COPY --from=builder /app/packages/core/skills ./packages/core/skills
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules

# Control UI
COPY --from=builder /app/packages/dist/control-ui ./packages/dist/control-ui

WORKDIR /app/packages/core

ENV NODE_ENV=production

# Security: run as non-root
RUN chown -R node:node /app
USER node

# Default: start gateway
CMD ["node", "dist/index.js", "gateway", "--allow-unconfigured"]
