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
  storage/         — PostgreSQL models and repository
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
- `DATABASE_URL` — PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN` — channel tokens
- `POLYGON_API_KEY` — premium data (optional, falls back to yfinance)

## Docker

```bash
docker compose up -d db      # Start PostgreSQL
docker compose up app         # Start app
```

## Rules

- **MUST** use `uv` for all package management
- **MUST NOT** use pip, npm, or any other package manager
- **MUST** ALWAYS check ide warnings after finish coding
- Keep files under ~500 LOC
- Use async/await throughout
- Type hints on all function signatures
