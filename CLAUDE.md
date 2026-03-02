# AlphaClaw

OpenClaw-inspired agentic financial assistant for market intelligence and earnings analysis.

## Architecture

```
User (Telegram/Discord/Slack/Teams/Web)
  |
  v
Channel Adapter (receives message)
  |
  v
Agent Loop (PydanticAI agent with tools)
  |
  +-- get_quote, get_historical, get_earnings, get_company_info
  +-- search_news, search_filings
  +-- get_watchlist, update_watchlist, compare_performance
  |
  v
Response -> Channel Adapter -> User
```

## Project Structure

```
src/alphaclaw/
  main.py          — Entry point, starts channels + scheduler
  config.py        — Pydantic Settings (env vars)
  agent/           — PydanticAI agent, tool definitions, system prompts
  channels/        — Channel adapters (web, telegram, discord, slack, teams)
  data/            — Data providers (yfinance, polygon, sec)
  storage/         — MySQL models and repository
  scheduler/       — Daily market brief pipeline
```

## Build, Test, and Development

- Runtime: Python 3.12+
- Package manager: `uv` (MUST use uv, NEVER pip/poetry)
- Install deps: `uv sync`
- Run: `uv run alphaclaw`
- Run (module): `uv run python -m alphaclaw`
- Tests: `uv run pytest`
- Single test: `uv run pytest tests/test_agent.py`
- DB migrations: `uv run alembic upgrade head`
- New migration: `uv run alembic revision --autogenerate -m "description"`

## Configuration

All config via environment variables (or `.env` file). See `.env.example`.

Key variables:

- `ALPHACLAW_MODEL` — PydanticAI model string (default: `anthropic/claude-sonnet-4-5-20250929`, slash auto-converted to colon)
- `DATABASE_URL` — MySQL connection string (e.g. `mysql+aiomysql://alphaclaw:alphaclaw@localhost:3306/alphaclaw`)
- `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN` — channel tokens
- `POLYGON_API_KEY` — premium data (optional, falls back to yfinance)

## Deployment (Cloudflare)

All-Cloudflare stack: CF Workers/Pages (web SSR) → CF Container (Python backend) → Cloud MySQL + R2.

```bash
# Deploy web + container (from web/)
cd web && npx wrangler deploy

# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put ANTHROPIC_API_KEY
```

CI/CD: `.github/workflows/deploy.yml` — runs `uv run pytest`, then deploys on push to `main`.

## Docker (Local Development)

```bash
# Start MySQL only (run app locally with uv)
docker compose -f compose.development.yml up -d db

# Start MySQL + app (with hot-reload volume mounts)
docker compose -f compose.development.yml up -d
```

Web UI: `cd web && npm run dev` (local) or deployed to CF Workers/Pages.

## Rules

- **MUST** use `uv` for all package management
- **must** use `uv run python3` when you need to run pythong script
- **MUST NOT** use pip, npm, or any other package manager
- **MUST** ALWAYS check ide warnings after finish coding
- **MUST** Keep files under ~500 LOC or split them into smaller ones
- **MUST** Use async/await throughout
- **MUST** Type hints on all function signatures
- **MUST** check ide warnings after you finish coding every single time
