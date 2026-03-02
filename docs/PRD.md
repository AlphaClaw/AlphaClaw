# AlphaClaw — Product Requirements Document

## Vision

AlphaClaw is an agentic financial copilot for serious retail investors. It helps you deeply understand a company before you invest — replacing impulsive, news-driven buying with informed, research-backed decisions.

You talk to it like a knowledgeable analyst friend. It pulls data, reads filings, scans news, and synthesizes everything into clear, actionable analysis.

## Target User

**Serious retail investor** with significant capital in the stock market who:

- Currently buys based on news and hype without proper due diligence
- Wants to understand a company's business, financials, valuation, and risks before investing
- Doesn't have time (or patience) to read 10-Ks, cross-reference earnings, and build spreadsheets
- Wants an always-available research assistant across Telegram, Discord, or Web

## Design Principles

1. **Depth over speed** — A thorough 2-minute research report beats a shallow 5-second answer
2. **Opinionated, not neutral** — Surface the bull AND bear case; don't just dump data
3. **Progressive disclosure** — Start with a structured summary, then let the user drill deeper
4. **Free-first data** — Maximize value from free sources before requiring paid APIs
5. **Conversational** — Natural language in, structured insight out

---

## Feature 1: Deep Company Research (MVP)

### Overview

The user asks AlphaClaw to research a company. The agent autonomously gathers data from multiple sources, analyzes it, and produces a structured research report. The user can then ask follow-up questions to drill deeper into any area.

### User Flow

```
User: "Research NVDA"
  |
  v
Agent acknowledges and begins autonomous research
  |
  +-- Pulls company profile & financials (yfinance)
  +-- Fetches earnings history & estimates (yfinance)
  +-- Retrieves recent SEC filings (EDGAR)
  +-- Searches recent news & commentary (web/RSS)
  +-- Identifies peer companies for comparison
  |
  v
Agent synthesizes data into structured research report
  |
  v
User receives report, asks follow-ups:
  "How does their margin compare to AMD?"
  "What did management say about AI revenue on the last call?"
  "What are the biggest risks?"
```

### Research Report Structure

The report should follow this outline, with each section being concise but substantive:

#### 1. Company Overview & Business Model
- What the company does (in plain language)
- Revenue segments and breakdown by product/geography
- Key customers and concentration
- Competitive position and moat

#### 2. Financial Health
- Revenue and earnings growth (3-5 year trend)
- Gross, operating, and net margins (with trend)
- Free cash flow generation
- Balance sheet: cash position, total debt, debt-to-equity
- Capital allocation: buybacks, dividends, R&D spend

#### 3. Earnings Track Record
- Recent quarters: EPS and revenue vs estimates (beat/miss history)
- Guidance trends: raising, maintaining, or lowering
- Key metrics management highlights
- Any notable one-time items or accounting changes

#### 4. Valuation
- Current: P/E, forward P/E, P/S, EV/EBITDA, PEG
- Historical comparison: current multiples vs 3-year average
- Peer comparison: same metrics for 2-3 closest competitors
- Simple assessment: expensive, fair, or cheap relative to growth

#### 5. Recent News & Developments
- Last 30 days of material news
- Latest SEC filings summary (10-K, 10-Q, 8-K)
- Analyst rating changes (if available)
- Insider buying/selling activity

#### 6. Key Risks
- Business risks: competition, customer concentration, regulatory
- Financial risks: debt, cash burn, margin pressure
- Macro risks: interest rates, sector rotation, geopolitical
- Stock-specific: short interest, lockup expirations, dilution

#### 7. Bull / Bear Case
- **Bull case**: 3-4 reasons this stock could outperform
- **Bear case**: 3-4 reasons this stock could underperform
- What would change each thesis

### Data Sources (Free Tier)

| Source | What it provides | Status |
|--------|-----------------|--------|
| **yfinance** | Price, fundamentals, financials, earnings, company info | Built |
| **SEC EDGAR** | 10-K, 10-Q, 8-K filings | Built |
| **RSS feeds** | Financial news from public sources | To build |
| **Free news APIs** | Structured news data (e.g., NewsAPI free tier, Finviz) | To build |
| **Web scraping** | Earnings call transcripts, analyst commentary | To build |

### New Tools Required

The agent needs additional tools beyond what currently exists:

| Tool | Purpose |
|------|---------|
| `get_financials` | Income statement, balance sheet, cash flow statement (yfinance has this) |
| `get_insider_activity` | Insider buying/selling transactions |
| `get_analyst_ratings` | Consensus rating, price targets |
| `search_web_news` | Search news from RSS feeds and free news APIs |
| `generate_research_report` | Orchestrator tool that runs the full research pipeline |

### Follow-up Conversation

After delivering the report, the agent retains context and can answer follow-ups:

- Drill deeper into any section ("Tell me more about their debt")
- Compare with peers ("How does this compare to AMD?")
- Clarify data ("What was last quarter's revenue exactly?")
- Update opinion ("Given all this, would you buy at this price?")

The agent should be honest about the limits of its analysis — it's a research assistant, not a financial advisor.

### Success Criteria

- User can say "Research [TICKER]" and receive a complete report within 60 seconds
- Report covers all 7 sections with real data (not generic filler)
- User can ask at least 3 follow-up questions that get substantive answers
- Works across Web, Telegram, and Discord channels

---

## Feature Backlog (Future)

Features below are ordered by expected value. Not specced yet — will be detailed when prioritized.

### 2. Proactive Alerts & Monitoring
- Price alerts: "Tell me when AAPL drops below $180"
- Earnings reminders: "MSFT reports tomorrow, here's what to watch"
- Watchlist movers: "3 of your stocks moved >5% today"
- Filing alerts: "New 8-K filed for GOOG"
- News alerts: "Breaking news about a company you own"

### 3. Portfolio Intelligence
- Import holdings (manual entry or broker CSV)
- Portfolio overview: allocation, sector exposure, concentration risk
- Performance attribution: what's driving returns
- Risk analysis: correlation, beta, drawdown history
- Rebalancing suggestions based on target allocation

### 4. Earnings Season Tracker
- Track upcoming earnings for watchlist companies
- Pre-earnings preview: what to expect, key metrics to watch
- Post-earnings analysis: beat/miss, market reaction, guidance changes
- Earnings calendar view

### 5. Comparables & Screening
- "Compare NVDA vs AMD vs INTC"
- Side-by-side financials, valuation, and growth metrics
- Simple screening: "Show me large-cap tech stocks with P/E under 25"
- Sector/industry overviews

### 6. Investment Thesis Builder
- Guided workflow to build a bull/bear case
- Save and track theses over time
- Thesis invalidation alerts: "Your bull case for PLTR assumed >30% revenue growth, but they just guided for 20%"

### 7. Daily Market Brief (Enhanced)
- Personalized to your holdings and watchlist
- Index performance, sector rotation, notable movers
- Economic calendar events and their impact
- "What happened while I was sleeping" summary

---

## Web UI

### Layout: Dashboard + Chat Sidebar

The primary interface is a web dashboard with a collapsible chat sidebar.

```
+-------------------------------------------------+
|  AlphaClaw        [Search ticker...]    [Chat]  |
+-------------------------------------------------+
|                              |  Chat Panel      |
|  ## NVDA Research Report     |                  |
|  ========================    |  You: Tell me    |
|  Overview | Financials       |  about their     |
|  Valuation | Risks           |  debt situation  |
|  --------------------------  |                  |
|  [Revenue Growth Chart]      |  Agent: NVDA     |
|  [Margin Trend Chart]        |  has $9.7B in    |
|  [Peer Comparison Table]     |  long-term...    |
|  --------------------------  |                  |
|  Bull Case | Bear Case       |                  |
|                              |  [Message...]    |
+-------------------------------------------------+
```

### Pages

| Page | Purpose |
|------|---------|
| **Home / Dashboard** | Search bar, recent reports, watchlist summary |
| **Research Report** | Full research report for a single company — tabbed sections, charts, tables |
| **Watchlist** | List of tracked tickers with key metrics, quick actions |
| **Report History** | Previously generated reports with date and ticker |

### Research Report Page

This is the core page. When the user triggers "Research NVDA", this page renders with:

- **Header**: Ticker, company name, current price, change, market cap
- **Tabbed sections**: Overview, Financials, Earnings, Valuation, News, Risks, Bull/Bear
- **Charts** (using Recharts, already installed):
  - Revenue & earnings growth (bar chart, multi-year)
  - Margin trends (line chart)
  - Stock price vs peers (line chart)
  - EPS beat/miss history (bar chart with positive/negative)
  - Valuation multiples vs peers (grouped bar chart)
- **Tables**:
  - Income statement summary (3-5 years)
  - Balance sheet highlights
  - Peer comparison matrix
  - Recent insider transactions
  - Recent SEC filings

### Chat Sidebar

- Collapsible panel on the right (~350px wide)
- Connects to existing WebSocket endpoint (`/ws`)
- Conversation is contextual to the current report
- Supports markdown rendering for agent responses
- Shows typing indicator while agent is working
- Persists conversation history per report

### Design System

- Already have: Tailwind CSS v4, shadcn/ui (50+ components), Lucide icons, Recharts
- Style: Clean, data-dense, dark mode preferred (easier on eyes for financial data)
- Typography: Monospace for numbers/prices, sans-serif for text
- Color: Green/red for positive/negative changes (standard financial convention)

### API Requirements

The FastAPI backend needs new REST endpoints alongside the existing WebSocket:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/research/{ticker}` | POST | Trigger research report generation |
| `/api/research/{ticker}` | GET | Retrieve cached report |
| `/api/research/history` | GET | List previously generated reports |
| `/api/watchlist` | GET/POST/DELETE | Manage watchlist |
| `/api/quote/{ticker}` | GET | Quick quote for display |
| `/ws` | WebSocket | Chat (already exists) |

### Streaming

Research reports take time to generate (many tool calls + LLM synthesis). The UI should:

- Show a progress indicator with current step ("Fetching financials...", "Analyzing earnings...", "Writing report...")
- Stream report sections as they become available (not wait for the full report)
- Use Server-Sent Events (SSE) or WebSocket for progress updates

---

## Technical Considerations

### Data Architecture
- Cache financial data to avoid redundant API calls (yfinance has rate limits)
- Store research reports in DB for retrieval and comparison
- News/RSS data should be refreshed on a schedule, not on every request

### Agent Design
- Research report generation should use a multi-step agent workflow:
  1. Gather all raw data (parallel tool calls)
  2. Analyze and synthesize (single LLM pass with all context)
  3. Format and deliver
- Long reports may need chunking for chat channels (Telegram has message size limits)

### Cost Management
- Research reports will use significant LLM tokens (large context from filings/financials)
- Consider caching reports and refreshing only when new data is available
- Free data sources should be prioritized; paid APIs are opt-in enhancements

---

## Deployment

### Architecture — All Cloudflare

```
CF Workers/Pages (web: TanStack Start SSR + API routes)
  ↓ (container binding)
CF Container (Python: FastAPI + chat channels + scheduler)
  ↓
Cloud MySQL (DATABASE_URL — provider-agnostic)
CF R2 (S3-compatible object storage via aioboto3)
External APIs (yfinance, Polygon, SEC EDGAR, Anthropic)
```

Everything runs on Cloudflare. The web app (TanStack Start on CF Workers) holds a
container binding to the Python backend and proxies API/WebSocket requests. A cron
trigger pings `/health` every 5 minutes to keep the container warm for chat bots.

Total cost: CF free tiers + cloud MySQL + LLM API usage.

### How It Works

- **Web + API gateway**: `web/` deploys to CF Workers/Pages. The `wrangler.jsonc` defines a
  `containers` binding that builds the Python `Dockerfile` as a CF Container. SSR API routes
  proxy requests to the container.
- **Python backend**: Same FastAPI app, same Dockerfile. Runs as a CF Container (max 1 instance)
  with 2h sleep timeout. Handles chat channels (Telegram, Discord, Slack, Teams), scheduler,
  and all LLM/data tool calls.
- **Keep-alive**: Cron trigger every 5 min pings `/health` to prevent container sleep while
  chat bots need persistent connections.

### Deploy

```bash
# Deploy everything (web + container) from web/
cd web && npx wrangler deploy

# Set secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ALPHACLAW_R2_ACCOUNT_ID
npx wrangler secret put ALPHACLAW_R2_ACCESS_KEY_ID
npx wrangler secret put ALPHACLAW_R2_SECRET_ACCESS_KEY
```

CI/CD: `.github/workflows/deploy.yml` runs Python tests then deploys on push to `main`.

### Database: Cloud MySQL

Provider-agnostic — just a `DATABASE_URL`. Options: TiDB Serverless (free tier), PlanetScale,
or any managed MySQL. The app uses `aiomysql` + SQLAlchemy async.

### Object Storage: Cloudflare R2

S3-compatible, generous free tier (10GB storage, no egress fees). Accessed via `aioboto3`.

| Bucket / Prefix | Purpose |
|---|---|
| `filings/` | Downloaded SEC filings (10-K, 10-Q, 8-K PDFs/HTML) |
| `reports/` | Generated research reports (structured JSON + rendered HTML/PDF) |
| `cache/` | Cached financial data snapshots (reduce yfinance calls) |
| `news/` | Scraped news articles and RSS content |

Config: `ALPHACLAW_R2_ACCOUNT_ID`, `ALPHACLAW_R2_ACCESS_KEY_ID`, `ALPHACLAW_R2_SECRET_ACCESS_KEY`, `ALPHACLAW_R2_BUCKET_NAME`

### Local Development

```bash
docker compose -f compose.development.yml up -d db    # Local MySQL
uv run alphaclaw                                        # Run Python backend
cd web && npm run dev                                   # Run web frontend
```

---

## Non-Goals (For Now)

- **Trade execution** — AlphaClaw does not place trades
- **Real-time streaming** — Not a Bloomberg terminal replacement
- **Backtesting** — Not a quant platform
- **Social/community features** — Single-user tool, not a social network
- **Mobile app** — Chat channels (Telegram/Discord) are the mobile interface
