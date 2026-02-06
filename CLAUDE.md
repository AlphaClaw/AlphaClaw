# AlphaClaw

AlphaClaw is an AI-native financial copilot — a chat-first agent that lives in your messaging apps (Telegram, Discord, Slack, WhatsApp) and helps you stay on top of markets, analyze investments, and make better financial decisions through conversation.

**Built as a distribution of [OpenClaw](https://github.com/openclaw/openclaw)** — inheriting its multi-channel AI gateway, agent framework (Pi), and messaging infrastructure — then specialized for finance and investments.

## Vision

Not another report generator. AlphaClaw is conversational:

- Ask "why did TSLA drop today?" and get a sourced, real-time answer
- Say "compare my watchlist against S&P this quarter" and get interactive analysis
- The agent **proactively** pushes a daily market brief to your channel
- You **reply back** — "dig deeper into the semiconductor exposure"
- It remembers your portfolio, preferences, and past conversations

## Architecture Overview

**Inherited from OpenClaw:**

- **Gateway:** `packages/core/src/gateway/server.impl.ts` — WebSocket + HTTP server. Manages channels, agent coordination, cron, plugin loading, control UI, and OpenAI-compatible API.
- **Agent/AI:** `packages/core/src/agents/` — Built on `@mariozechner/pi-*` packages. Model provider abstraction supports Anthropic, OpenAI, Google, Bedrock, xAI, etc. with auth profiles and failover.
- **Channels:** `packages/core/src/channels/` — Telegram, Discord, Slack, WhatsApp (via Baileys), and extensible via plugins.
- **Routing:** `packages/core/src/routing/resolve-route.ts` — Resolves which agent handles a message.
- **Sessions:** `packages/core/src/config/sessions/store.ts` — Persistent conversation context.
- **Cron:** `packages/core/src/cron/` — Scheduled tasks (daily briefs, market open alerts).
- **Plugins:** `packages/core/src/plugins/` — Extension system for adding new data sources, tools, and capabilities.
- **Config:** `packages/core/src/config/` — JSON5 format, Zod schema validation, hot reload.
- **CLI:** `packages/core/alphaclaw.mjs` → `src/entry.ts` → Commander.js program.

**AlphaClaw-specific (to be built):**

- **Financial data tools:** Market data, SEC filings, earnings calendars, news feeds — exposed as agent tools the AI can call mid-conversation.
- **Portfolio/watchlist tracking:** Persistent user portfolios the agent references in context.
- **Daily brief pipeline:** Cron-triggered analysis → formatted market summary → pushed to user's channel.
- **Domain system prompts:** Finance-specific agent personality, analysis frameworks, citation practices.

## Project Structure

```
AlphaClaw/
├── packages/
│   ├── core/             # Core application (forked from OpenClaw)
│   │   ├── src/
│   │   │   ├── agents/   # Pi agent integration
│   │   │   ├── channels/ # Channel adapters (Telegram, Discord, Slack, etc.)
│   │   │   ├── cli/      # CLI wiring (Commander.js)
│   │   │   ├── commands/ # CLI commands
│   │   │   ├── config/   # Configuration (JSON5, Zod)
│   │   │   ├── cron/     # Scheduled tasks
│   │   │   ├── gateway/  # WebSocket + HTTP server
│   │   │   ├── plugins/  # Plugin system
│   │   │   ├── routing/  # Message routing
│   │   │   └── ...
│   │   └── alphaclaw.mjs # CLI entry point
│   ├── ui/               # Control UI (Lit + Vite)
│   └── extensions/       # Channel/feature plugins
├── package.json          # Monorepo root (pnpm workspaces)
└── CLAUDE.md             # This file
```

## Build, Test, and Development

- Runtime: Node **22+**. Prefer Bun for dev execution.
- Install deps: `pnpm install`
- Run CLI in dev: `pnpm alphaclaw ...` or `bun packages/core/alphaclaw.mjs ...`
- Type-check/build: `pnpm build`
- Lint/format: `pnpm check`
- Tests: `pnpm test` (Vitest)
- Run single test: `pnpm vitest run packages/core/src/path/to/file.test.ts`

## Coding Style

- Language: TypeScript (ESM). Strict typing; avoid `any`.
- Formatting/linting: Oxlint + Oxfmt. Run `pnpm check` before commits.
- Keep files under ~500 LOC; split when it improves clarity.
- Brief comments for non-obvious logic.
- Naming: **AlphaClaw** for product/docs headings; `alphaclaw` for CLI command, package name, paths.

## Upstream Relationship

AlphaClaw is forked from OpenClaw. Key decisions:

- **Keep:** Multi-channel gateway, Pi agent framework, session management, cron, plugin system, Telegram/Discord/Slack/WhatsApp adapters.
- **Add:** Financial data tools, portfolio tracking, market analysis prompts, daily brief pipeline.
- **Deprioritize:** iMessage/Signal adapters, macOS menubar app, iOS/Android apps (may revisit later).
- **Upstream syncing:** Periodically pull improvements from OpenClaw's core infrastructure. Avoid diverging the gateway/agent/channel layers unnecessarily.

## Commit Guidelines

- Concise, action-oriented messages (e.g., `feat: add earnings calendar tool`).
- Group related changes; avoid bundling unrelated refactors.
- Run `pnpm build && pnpm check && pnpm test` before pushing.

## Security

- Never commit real API keys, phone numbers, or portfolio data.
- Use fake placeholders in docs, tests, and examples.
- Financial data API keys belong in environment variables or `~/.alphaclaw/credentials/`, never in source.

# Rules

- **MUST** ALWAYS USE bun
- **MUST** NEVER USE npm
