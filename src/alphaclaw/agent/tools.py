"""Agent tools — registered via @agent.tool decorators.

PydanticAI auto-generates JSON schemas from function signatures and docstrings.
Data providers are injected via the Deps dataclass on each run.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic_ai import RunContext

from alphaclaw.agent.agent import Deps, agent

log = logging.getLogger(__name__)

_TICKER_RE = re.compile(r"^[A-Za-z]{1,5}$")
_VALID_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"}
_VALID_FILING_TYPES = {"10-K", "10-Q", "8-K"}


def _json(data: Any) -> str:
    return json.dumps(data, default=str)


def _validate_ticker(ticker: str) -> str:
    ticker = ticker.strip().upper()
    if not _TICKER_RE.match(ticker):
        raise ValueError(f"Invalid ticker symbol: {ticker!r}")
    return ticker


def _validate_period(period: str) -> str:
    period = period.strip().lower()
    if period not in _VALID_PERIODS:
        raise ValueError(f"Invalid period: {period!r}. Must be one of {_VALID_PERIODS}")
    return period


@agent.tool
async def get_quote(ctx: RunContext[Deps], ticker: str) -> str:
    """Get current price, change, and volume for a stock ticker.

    Args:
        ticker: Stock ticker symbol (e.g. AAPL)
    """
    try:
        ticker = _validate_ticker(ticker)
        result = await ctx.deps.market.get_quote(ticker)
        return _json(result)
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("get_quote failed for %s", ticker)
        return _json({"error": f"Failed to get quote for {ticker}: {e}"})


@agent.tool
async def get_historical(ctx: RunContext[Deps], ticker: str, period: str = "1mo") -> str:
    """Get historical price data for a ticker. Returns OHLCV data.

    Args:
        ticker: Stock ticker symbol
        period: Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y
    """
    try:
        ticker = _validate_ticker(ticker)
        period = _validate_period(period)
        result = await ctx.deps.market.get_historical(ticker, period)
        return _json(result)
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("get_historical failed for %s", ticker)
        return _json({"error": f"Failed to get historical data for {ticker}: {e}"})


@agent.tool
async def get_earnings(ctx: RunContext[Deps], ticker: str) -> str:
    """Get earnings data including EPS, revenue, and estimates for a ticker.

    Args:
        ticker: Stock ticker symbol
    """
    try:
        ticker = _validate_ticker(ticker)
        result = await ctx.deps.market.get_earnings(ticker)
        return _json(result)
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("get_earnings failed for %s", ticker)
        return _json({"error": f"Failed to get earnings for {ticker}: {e}"})


@agent.tool
async def get_company_info(ctx: RunContext[Deps], ticker: str) -> str:
    """Get company profile: sector, industry, market cap, description.

    Args:
        ticker: Stock ticker symbol
    """
    try:
        ticker = _validate_ticker(ticker)
        result = await ctx.deps.market.get_company_info(ticker)
        return _json(result)
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("get_company_info failed for %s", ticker)
        return _json({"error": f"Failed to get company info for {ticker}: {e}"})


@agent.tool
async def search_news(ctx: RunContext[Deps], query: str) -> str:
    """Search for recent financial news by topic or ticker.

    Args:
        query: Search query (ticker or topic)
    """
    try:
        query = query.strip()
        if not query:
            return _json({"error": "Query must not be empty"})
        result = await ctx.deps.market.search_news(query)
        return _json(result)
    except Exception as e:
        log.exception("search_news failed for %s", query)
        return _json({"error": f"Failed to search news for {query!r}: {e}"})


@agent.tool
async def search_filings(ctx: RunContext[Deps], ticker: str, filing_type: str = "10-K") -> str:
    """Search SEC EDGAR filings for a company.

    Args:
        ticker: Stock ticker symbol
        filing_type: Filing type: 10-K, 10-Q, 8-K
    """
    try:
        ticker = _validate_ticker(ticker)
        filing_type = filing_type.strip().upper()
        if filing_type not in _VALID_FILING_TYPES:
            return _json({"error": f"Invalid filing type: {filing_type!r}. Must be one of {_VALID_FILING_TYPES}"})
        result = await ctx.deps.sec.search_filings(ticker, filing_type)
        return _json(result)
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("search_filings failed for %s", ticker)
        return _json({"error": f"Failed to search filings for {ticker}: {e}"})


@agent.tool
async def get_watchlist(ctx: RunContext[Deps]) -> str:
    """Get the user's saved watchlist of tickers."""
    if not ctx.deps.user_id or not ctx.deps.repo:
        return _json({"tickers": [], "note": "No user context — watchlist unavailable"})
    try:
        repo = ctx.deps.repo
        user = await repo.get_or_create_user(ctx.deps.channel, ctx.deps.user_id)
        wl = await repo.get_watchlist(user.id)
        return _json({"tickers": wl.tickers if wl else [], "name": wl.name if wl else "default"})
    except Exception as e:
        log.exception("get_watchlist failed")
        return _json({"error": f"Failed to get watchlist: {e}"})


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
    if not ctx.deps.user_id or not ctx.deps.repo:
        return _json({"error": "No user context — cannot update watchlist"})
    try:
        add = add or []
        remove = remove or []
        repo = ctx.deps.repo
        user = await repo.get_or_create_user(ctx.deps.channel, ctx.deps.user_id)
        wl = await repo.get_watchlist(user.id)
        current = list(wl.tickers) if wl else []
        for t in add:
            t_upper = _validate_ticker(t)
            if t_upper not in current:
                current.append(t_upper)
        for t in remove:
            try:
                current.remove(t.strip().upper())
            except ValueError:
                pass
        wl = await repo.upsert_watchlist(user.id, current)
        return _json({"tickers": wl.tickers, "name": wl.name})
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("update_watchlist failed")
        return _json({"error": f"Failed to update watchlist: {e}"})


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
    try:
        tickers = [_validate_ticker(t) for t in tickers]
        benchmark = _validate_ticker(benchmark)
        period = _validate_period(period)
        result = await ctx.deps.market.compare_performance(tickers, benchmark, period)
        return _json(result)
    except ValueError as e:
        return _json({"error": str(e)})
    except Exception as e:
        log.exception("compare_performance failed")
        return _json({"error": f"Failed to compare performance: {e}"})


@agent.tool
async def get_latest_brief(ctx: RunContext[Deps]) -> str:
    """Get the most recent daily market brief."""
    if not ctx.deps.repo:
        return _json({"error": "No database context available"})
    try:
        brief = await ctx.deps.repo.get_latest_brief()
        if brief is None:
            return _json({"content": None, "note": "No daily brief has been generated yet"})
        return _json({"content": brief.content, "generated_at": brief.generated_at})
    except Exception as e:
        log.exception("get_latest_brief failed")
        return _json({"error": f"Failed to get latest brief: {e}"})
