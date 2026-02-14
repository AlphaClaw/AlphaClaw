"""Tool definitions for the agent loop.

Each tool is a dict matching the OpenAI function-calling schema
(which LiteLLM passes through to any provider). The actual
implementations live in alphaclaw.data and alphaclaw.storage.
"""

from __future__ import annotations

import json
from typing import Any

from alphaclaw.data.yfinance import YFinanceProvider
from alphaclaw.data.polygon import PolygonProvider
from alphaclaw.data.sec import SECProvider
from alphaclaw.config import settings
from alphaclaw.storage.db import async_session
from alphaclaw.storage.repo import Repository

# Pick data provider based on config
_market = PolygonProvider() if settings.polygon_api_key else YFinanceProvider()
_sec = SECProvider()

TOOL_SCHEMAS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "get_quote",
            "description": "Get current price, change, and volume for a stock ticker.",
            "parameters": {
                "type": "object",
                "properties": {"ticker": {"type": "string", "description": "Stock ticker symbol (e.g. AAPL)"}},
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_historical",
            "description": "Get historical price data for a ticker. Returns OHLCV data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Stock ticker symbol"},
                    "period": {
                        "type": "string",
                        "description": "Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y",
                        "default": "1mo",
                    },
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_earnings",
            "description": "Get earnings data including EPS, revenue, and estimates for a ticker.",
            "parameters": {
                "type": "object",
                "properties": {"ticker": {"type": "string", "description": "Stock ticker symbol"}},
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_info",
            "description": "Get company profile: sector, industry, market cap, description.",
            "parameters": {
                "type": "object",
                "properties": {"ticker": {"type": "string", "description": "Stock ticker symbol"}},
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_news",
            "description": "Search for recent financial news by topic or ticker.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search query (ticker or topic)"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_filings",
            "description": "Search SEC EDGAR filings for a company.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Stock ticker symbol"},
                    "filing_type": {
                        "type": "string",
                        "description": "Filing type: 10-K, 10-Q, 8-K",
                        "default": "10-K",
                    },
                },
                "required": ["ticker"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_watchlist",
            "description": "Get the user's saved watchlist of tickers.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_watchlist",
            "description": "Add or remove tickers from the user's watchlist.",
            "parameters": {
                "type": "object",
                "properties": {
                    "add": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tickers to add",
                        "default": [],
                    },
                    "remove": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tickers to remove",
                        "default": [],
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_performance",
            "description": "Compare price performance of tickers against a benchmark over a period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tickers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tickers to compare",
                    },
                    "benchmark": {"type": "string", "description": "Benchmark ticker (default: SPY)", "default": "SPY"},
                    "period": {"type": "string", "description": "Time period: 1mo, 3mo, 6mo, 1y", "default": "3mo"},
                },
                "required": ["tickers"],
            },
        },
    },
]


async def execute_tool(name: str, arguments: dict[str, Any], user_id: str | None = None) -> str:
    """Execute a tool by name and return the JSON result."""
    try:
        match name:
            case "get_quote":
                result = await _market.get_quote(arguments["ticker"])
            case "get_historical":
                result = await _market.get_historical(arguments["ticker"], arguments.get("period", "1mo"))
            case "get_earnings":
                result = await _market.get_earnings(arguments["ticker"])
            case "get_company_info":
                result = await _market.get_company_info(arguments["ticker"])
            case "search_news":
                result = await _market.search_news(arguments["query"])
            case "search_filings":
                result = await _sec.search_filings(arguments["ticker"], arguments.get("filing_type", "10-K"))
            case "get_watchlist":
                result = await _get_watchlist(user_id)
            case "update_watchlist":
                result = await _update_watchlist(
                    user_id, arguments.get("add", []), arguments.get("remove", [])
                )
            case "compare_performance":
                result = await _market.compare_performance(
                    arguments["tickers"], arguments.get("benchmark", "SPY"), arguments.get("period", "3mo")
                )
            case _:
                result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result, default=str)


async def _get_watchlist(user_id: str | None) -> dict:
    if not user_id:
        return {"tickers": [], "note": "No user context — watchlist unavailable"}
    async with async_session() as session:
        repo = Repository(session)
        user = await repo.get_or_create_user("unknown", user_id)
        wl = await repo.get_watchlist(user.id)
        return {"tickers": wl.tickers if wl else [], "name": wl.name if wl else "default"}


async def _update_watchlist(user_id: str | None, add: list[str], remove: list[str]) -> dict:
    if not user_id:
        return {"error": "No user context — cannot update watchlist"}
    async with async_session() as session:
        repo = Repository(session)
        user = await repo.get_or_create_user("unknown", user_id)
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
        return {"tickers": wl.tickers, "name": wl.name}
