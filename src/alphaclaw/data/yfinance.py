"""Yahoo Finance data provider (free)."""

from __future__ import annotations

import asyncio
from functools import partial
from typing import Any

import yfinance as yf


def _sync_quote(ticker: str) -> dict[str, Any]:
    t = yf.Ticker(ticker)
    info = t.info
    return {
        "ticker": ticker.upper(),
        "price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "previous_close": info.get("previousClose") or info.get("regularMarketPreviousClose"),
        "change": info.get("currentPrice", 0) - info.get("previousClose", 0)
        if info.get("currentPrice") and info.get("previousClose")
        else None,
        "change_pct": info.get("regularMarketChangePercent"),
        "volume": info.get("volume") or info.get("regularMarketVolume"),
        "market_cap": info.get("marketCap"),
        "source": "Yahoo Finance",
    }


def _sync_historical(ticker: str, period: str) -> dict[str, Any]:
    t = yf.Ticker(ticker)
    df = t.history(period=period)
    if df.empty:
        return {"ticker": ticker.upper(), "data": [], "source": "Yahoo Finance"}
    records = []
    for date, row in df.iterrows():
        records.append({
            "date": str(date.date()),
            "open": round(row["Open"], 2),
            "high": round(row["High"], 2),
            "low": round(row["Low"], 2),
            "close": round(row["Close"], 2),
            "volume": int(row["Volume"]),
        })
    return {"ticker": ticker.upper(), "period": period, "data": records[-30:], "source": "Yahoo Finance"}


def _sync_earnings(ticker: str) -> dict[str, Any]:
    t = yf.Ticker(ticker)
    earnings = t.earnings_history
    if earnings is None or earnings.empty:
        return {"ticker": ticker.upper(), "data": [], "source": "Yahoo Finance"}
    records = []
    for _, row in earnings.tail(8).iterrows():
        records.append({
            "date": str(row.get("Earnings Date", "")),
            "eps_estimate": row.get("EPS Estimate"),
            "eps_actual": row.get("Reported EPS"),
            "surprise_pct": row.get("Surprise(%)"),
        })
    return {"ticker": ticker.upper(), "data": records, "source": "Yahoo Finance"}


def _sync_company_info(ticker: str) -> dict[str, Any]:
    t = yf.Ticker(ticker)
    info = t.info
    return {
        "ticker": ticker.upper(),
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "dividend_yield": info.get("dividendYield"),
        "52w_high": info.get("fiftyTwoWeekHigh"),
        "52w_low": info.get("fiftyTwoWeekLow"),
        "description": (info.get("longBusinessSummary") or "")[:500],
        "source": "Yahoo Finance",
    }


def _sync_news(query: str) -> dict[str, Any]:
    t = yf.Ticker(query)
    news = t.news or []
    items = []
    for n in news[:10]:
        content = n.get("content", {})
        items.append({
            "title": content.get("title", n.get("title", "")),
            "publisher": content.get("provider", {}).get("displayName", ""),
            "link": content.get("canonicalUrl", {}).get("url", ""),
            "published": content.get("pubDate", ""),
        })
    return {"query": query, "articles": items, "source": "Yahoo Finance"}


def _sync_compare(tickers: list[str], benchmark: str, period: str) -> dict[str, Any]:
    all_tickers = list(set(tickers + [benchmark]))
    results = {}
    for sym in all_tickers:
        t = yf.Ticker(sym)
        hist = t.history(period=period)
        if not hist.empty:
            start = hist["Close"].iloc[0]
            end = hist["Close"].iloc[-1]
            results[sym.upper()] = round(((end - start) / start) * 100, 2)
    benchmark_return = results.get(benchmark.upper(), 0)
    comparisons = []
    for sym in tickers:
        sym_upper = sym.upper()
        ret = results.get(sym_upper, 0)
        comparisons.append({
            "ticker": sym_upper,
            "return_pct": ret,
            "vs_benchmark": round(ret - benchmark_return, 2),
        })
    return {
        "benchmark": benchmark.upper(),
        "benchmark_return_pct": benchmark_return,
        "period": period,
        "comparisons": comparisons,
        "source": "Yahoo Finance",
    }


class YFinanceProvider:
    """Async wrapper around yfinance (sync library)."""

    async def get_quote(self, ticker: str) -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(None, partial(_sync_quote, ticker))

    async def get_historical(self, ticker: str, period: str = "1mo") -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(None, partial(_sync_historical, ticker, period))

    async def get_earnings(self, ticker: str) -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(None, partial(_sync_earnings, ticker))

    async def get_company_info(self, ticker: str) -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(None, partial(_sync_company_info, ticker))

    async def search_news(self, query: str) -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(None, partial(_sync_news, query))

    async def compare_performance(
        self, tickers: list[str], benchmark: str = "SPY", period: str = "3mo"
    ) -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(None, partial(_sync_compare, tickers, benchmark, period))
