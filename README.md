# AlphaClaw

OpenClaw-inspired agentic financial assistant for market intelligence and earnings analysis.

## Quick Start

```bash
# Install dependencies
uv sync

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Start PostgreSQL
docker compose up -d db

# Run migrations
uv run alembic upgrade head

# Start AlphaClaw
uv run alphaclaw
```

Open http://localhost:8000 to chat via the web interface.

## Features

- Real-time stock quotes and historical data
- Earnings analysis (EPS, revenue, estimates)
- SEC filing search (10-K, 10-Q, 8-K)
- Financial news search
- Portfolio and watchlist tracking
- Performance comparison against benchmarks
- Daily market briefs (scheduled)

## Channels

| Channel | Status | Config |
|---------|--------|--------|
| Web UI | Built-in | Always available at `:8000` |
| Telegram | Adapter | Set `TELEGRAM_BOT_TOKEN` |
| Discord | Adapter | Set `DISCORD_BOT_TOKEN` |
| Slack | Adapter | Set `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` |
| Teams | Adapter | Set `TEAMS_APP_ID` + `TEAMS_APP_PASSWORD` |

## Data Sources

- **Yahoo Finance** (free, default) — quotes, historical, earnings, news
- **Polygon.io** (premium, optional) — set `POLYGON_API_KEY` for higher quality data
- **SEC EDGAR** (free) — 10-K, 10-Q, 8-K filings

## License

MIT
