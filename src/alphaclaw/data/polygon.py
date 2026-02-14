"""Polygon.io data provider (premium)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import httpx

from alphaclaw.config import settings

BASE_URL = "https://api.polygon.io"


class PolygonProvider:
    def __init__(self) -> None:
        self.api_key = settings.polygon_api_key

    def _params(self, extra: dict | None = None) -> dict:
        p = {"apiKey": self.api_key}
        if extra:
            p.update(extra)
        return p

    async def _get(self, path: str, params: dict | None = None) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BASE_URL}{path}", params=self._params(params), timeout=15)
            resp.raise_for_status()
            return resp.json()

    async def get_quote(self, ticker: str) -> dict[str, Any]:
        data = await self._get(f"/v2/aggs/ticker/{ticker.upper()}/prev")
        results = data.get("results", [{}])
        r = results[0] if results else {}
        snap = await self._get(f"/v2/snapshot/locale/us/markets/stocks/tickers/{ticker.upper()}")
        tick = snap.get("ticker", {})
        day = tick.get("day", {})
        prev = tick.get("prevDay", {})
        return {
            "ticker": ticker.upper(),
            "price": day.get("c") or r.get("c"),
            "previous_close": prev.get("c") or r.get("c"),
            "change": tick.get("todaysChange"),
            "change_pct": tick.get("todaysChangePerc"),
            "volume": day.get("v") or r.get("v"),
            "source": "Polygon.io",
        }

    async def get_historical(self, ticker: str, period: str = "1mo") -> dict[str, Any]:
        days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "5y": 1825}
        n = days.get(period, 30)
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=n)).strftime("%Y-%m-%d")
        data = await self._get(f"/v2/aggs/ticker/{ticker.upper()}/range/1/day/{start}/{end}")
        records = []
        for r in (data.get("results") or [])[-30:]:
            from datetime import datetime as dt

            d = dt.fromtimestamp(r["t"] / 1000).strftime("%Y-%m-%d")
            records.append({
                "date": d,
                "open": r.get("o"),
                "high": r.get("h"),
                "low": r.get("l"),
                "close": r.get("c"),
                "volume": r.get("v"),
            })
        return {"ticker": ticker.upper(), "period": period, "data": records, "source": "Polygon.io"}

    async def get_earnings(self, ticker: str) -> dict[str, Any]:
        data = await self._get(f"/vX/reference/financials", {"ticker": ticker.upper(), "limit": 4})
        records = []
        for r in data.get("results", []):
            fs = r.get("financials", {})
            income = fs.get("income_statement", {})
            records.append({
                "period": r.get("fiscal_period"),
                "fiscal_year": r.get("fiscal_year"),
                "revenue": income.get("revenues", {}).get("value"),
                "net_income": income.get("net_income_loss", {}).get("value"),
                "eps": income.get("basic_earnings_per_share", {}).get("value"),
            })
        return {"ticker": ticker.upper(), "data": records, "source": "Polygon.io"}

    async def get_company_info(self, ticker: str) -> dict[str, Any]:
        data = await self._get(f"/v3/reference/tickers/{ticker.upper()}")
        r = data.get("results", {})
        return {
            "ticker": ticker.upper(),
            "name": r.get("name"),
            "sector": r.get("sic_description"),
            "market_cap": r.get("market_cap"),
            "locale": r.get("locale"),
            "primary_exchange": r.get("primary_exchange"),
            "description": (r.get("description") or "")[:500],
            "source": "Polygon.io",
        }

    async def search_news(self, query: str) -> dict[str, Any]:
        data = await self._get("/v2/reference/news", {"ticker": query.upper(), "limit": 10})
        items = []
        for r in data.get("results", []):
            items.append({
                "title": r.get("title"),
                "publisher": r.get("publisher", {}).get("name"),
                "link": r.get("article_url"),
                "published": r.get("published_utc"),
            })
        return {"query": query, "articles": items, "source": "Polygon.io"}

    async def compare_performance(
        self, tickers: list[str], benchmark: str = "SPY", period: str = "3mo"
    ) -> dict[str, Any]:
        days = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        n = days.get(period, 90)
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=n)).strftime("%Y-%m-%d")

        all_tickers = list(set(tickers + [benchmark]))
        results = {}
        for sym in all_tickers:
            data = await self._get(f"/v2/aggs/ticker/{sym.upper()}/range/1/day/{start}/{end}")
            bars = data.get("results") or []
            if len(bars) >= 2:
                s = bars[0]["c"]
                e = bars[-1]["c"]
                results[sym.upper()] = round(((e - s) / s) * 100, 2)

        benchmark_return = results.get(benchmark.upper(), 0)
        comparisons = []
        for sym in tickers:
            ret = results.get(sym.upper(), 0)
            comparisons.append({
                "ticker": sym.upper(),
                "return_pct": ret,
                "vs_benchmark": round(ret - benchmark_return, 2),
            })
        return {
            "benchmark": benchmark.upper(),
            "benchmark_return_pct": benchmark_return,
            "period": period,
            "comparisons": comparisons,
            "source": "Polygon.io",
        }
