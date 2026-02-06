# AlphaClaw

**AI-native financial copilot.** A chat-first agent that lives in your messaging apps and helps you stay on top of markets, analyze investments, and make better financial decisions through conversation.

Built on [OpenClaw](https://github.com/openclaw/openclaw) — inheriting its multi-channel AI gateway, agent framework, and messaging infrastructure — then specialized for finance.

## What it does

- Ask "why did TSLA drop today?" and get a sourced, real-time answer
- Say "compare my watchlist against S&P this quarter" and get interactive analysis
- Get a **daily market brief** pushed to your Telegram/Discord/Slack/WhatsApp
- Reply back — "dig deeper into the semiconductor exposure"
- It remembers your portfolio, preferences, and past conversations

## Features

- **Multi-channel** — Telegram, Discord, Slack, WhatsApp, and a built-in web UI
- **Multi-model** — Anthropic, OpenAI, Google, Bedrock, xAI with auth profiles and failover
- **E\*TRADE integration** — Query accounts, balances, positions, and real-time quotes
- **Web search** — Brave Search and Perplexity for real-time market research
- **Browser automation** — AI-controlled Playwright for scraping and research
- **Cron jobs** — Scheduled daily briefs, market open alerts, earnings reminders
- **Plugin system** — Extend with custom data sources, tools, and channels

## Quick start

**Requirements:** Node 22+, Bun

```bash
# Clone and install
git clone https://github.com/alphaclaw/alphaclaw.git
cd alphaclaw
bun install

# Build
bun run build

# Run the gateway (serves API + web UI on port 8888)
bun run --cwd packages/AlphaClaw alphaclaw gateway --port 8888
```

Open `http://localhost:8888` for the Control UI.

## Docker

```bash
# Build
docker build -t alphaclaw:local .

# Run
docker run -d \
  --name alphaclaw \
  -p 8888:8888 \
  -v ~/.alphaclaw:/home/node/.alphaclaw \
  --env-file .env \
  --restart unless-stopped \
  alphaclaw:local
```

Config and sessions persist in `~/.alphaclaw/`.

## Environment variables

Create a `.env` file at the monorepo root:

```bash
# Gateway
ALPHACLAW_GATEWAY_TOKEN=your-gateway-token

# AI model auth (pick one or more)
CLAUDE_AI_SESSION_KEY=
OPENAI_API_KEY=

# E*TRADE (optional)
ETRADE_CONSUMER_KEY=
ETRADE_CONSUMER_SECRET=
ETRADE_ACCESS_TOKEN=
ETRADE_ACCESS_TOKEN_SECRET=
ETRADE_SANDBOX=0

# Web search (optional)
BRAVE_API_KEY=
```

## Project structure

```
AlphaClaw/
├── packages/
│   ├── AlphaClaw/          # Core gateway + agent + channels
│   │   ├── src/
│   │   │   ├── agents/     # AI agent framework + tools
│   │   │   ├── channels/   # Telegram, Discord, Slack, WhatsApp
│   │   │   ├── config/     # JSON5 config, Zod validation
│   │   │   ├── cron/       # Scheduled tasks
│   │   │   ├── gateway/    # WebSocket + HTTP server
│   │   │   └── plugins/    # Extension system
│   │   └── alphaclaw.mjs   # CLI entry point
│   └── ui/                 # Control UI (Lit + Vite)
├── Dockerfile              # Multi-stage production build
└── package.json            # Monorepo root (Bun workspaces)
```

## Development

```bash
bun install              # Install deps
bun run build            # Build all packages
bun run check            # Lint + format (oxlint + oxfmt)
bun run test             # Run tests (vitest)
```

## License

MIT
