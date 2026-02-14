"""Agent tools — registered via @agent.tool decorators.

PydanticAI auto-generates JSON schemas from function signatures and docstrings.
Data providers are injected via the Deps dataclass on each run.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic_ai import RunContext

from alphaclaw.agent.agent import Deps, agent
from alphaclaw.storage.db import async_session
from alphaclaw.storage.repo import Repository


def _json(data: Any) -> str:
    return json.dumps(data, default=str)


@agent.tool
async def get_quote(ctx: RunContext[Deps], ticker: str) -> str:
    """Get current price, change, and volume for a stock ticker.

    Args:
        ticker: Stock ticker symbol (e.g. AAPL)
    """
    result = await ctx.deps.market.get_quote(ticker)
    return _json(result)


@agent.tool
async def get_historical(ctx: RunContext[Deps], ticker: str, period: str = "1mo") -> str:
    """Get historical price data for a ticker. Returns OHLCV data.

    Args:
        ticker: Stock ticker symbol
        period: Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y
    """
    result = await ctx.deps.market.get_historical(ticker, period)
    return _json(result)


@agent.tool
async def get_earnings(ctx: RunContext[Deps], ticker: str) -> str:
    """Get earnings data including EPS, revenue, and estimates for a ticker.

    Args:
        ticker: Stock ticker symbol
    """
    result = await ctx.deps.market.get_earnings(ticker)
    return _json(result)


@agent.tool
async def get_company_info(ctx: RunContext[Deps], ticker: str) -> str:
    """Get company profile: sector, industry, market cap, description.

    Args:
        ticker: Stock ticker symbol
    """
    result = await ctx.deps.market.get_company_info(ticker)
    return _json(result)


@agent.tool
async def search_news(ctx: RunContext[Deps], query: str) -> str:
    """Search for recent financial news by topic or ticker.

    Args:
        query: Search query (ticker or topic)
    """
    result = await ctx.deps.market.search_news(query)
    return _json(result)


@agent.tool
async def search_filings(ctx: RunContext[Deps], ticker: str, filing_type: str = "10-K") -> str:
    """Search SEC EDGAR filings for a company.

    Args:
        ticker: Stock ticker symbol
        filing_type: Filing type: 10-K, 10-Q, 8-K
    """
    result = await ctx.deps.sec.search_filings(ticker, filing_type)
    return _json(result)


@agent.tool
async def get_watchlist(ctx: RunContext[Deps]) -> str:
    """Get the user's saved watchlist of tickers."""
    if not ctx.deps.user_id:
        return _json({"tickers": [], "note": "No user context — watchlist unavailable"})
    async with async_session() as session:
        repo = Repository(session)
        user = await repo.get_or_create_user("unknown", ctx.deps.user_id)
        wl = await repo.get_watchlist(user.id)
        return _json({"tickers": wl.tickers if wl else [], "name": wl.name if wl else "default"})


@agent.tool
async def update_watchlist(
    ctx: RunContext[Deps],
    add: list[str] | None = None,
    remove: list[str] | None = None,
) -> str:
    """Add or remove tickers from the user's watchlist.

    Args:
        add: Tickers to add
        remove: Tickers to remove
    """
    if not ctx.deps.user_id:
        return _json({"error": "No user context — cannot update watchlist"})
    add = add or []
    remove = remove or []
    async with async_session() as session:
        repo = Repository(session)
        user = await repo.get_or_create_user("unknown", ctx.deps.user_id)
        wl = await repo.get_watchlist(user.id)
        current = list(wl.tickers) if wl else []
        for t in add:
            if t.upper() not in current:
                current.append(t.upper())
        for t in remove:
            try:
                current.remove(t.upper())
            except ValueError:
                pass
        wl = await repo.upsert_watchlist(user.id, current)
        return _json({"tickers": wl.tickers, "name": wl.name})


@agent.tool
async def compare_performance(
    ctx: RunContext[Deps],
    tickers: list[str],
    benchmark: str = "SPY",
    period: str = "3mo",
) -> str:
    """Compare price performance of tickers against a benchmark over a period.

    Args:
        tickers: Tickers to compare
        benchmark: Benchmark ticker (default: SPY)
        period: Time period: 1mo, 3mo, 6mo, 1y
    """
    result = await ctx.deps.market.compare_performance(tickers, benchmark, period)
    return _json(result)
