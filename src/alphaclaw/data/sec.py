"""SEC EDGAR filing search."""

from __future__ import annotations

import asyncio
from functools import partial
from pathlib import Path
from tempfile import mkdtemp
from typing import Any

from sec_edgar_downloader import Downloader


def _sync_search_filings(ticker: str, filing_type: str) -> dict[str, Any]:
    tmp = mkdtemp(prefix="alphaclaw_sec_")
    dl = Downloader("AlphaClaw", "alphaclaw@example.com", tmp)
    try:
        dl.get(filing_type, ticker, limit=5)
    except Exception as e:
        return {"ticker": ticker.upper(), "filing_type": filing_type, "filings": [], "error": str(e)}

    base = Path(tmp) / "sec-edgar-filings" / ticker.upper() / filing_type
    filings = []
    if base.exists():
        for filing_dir in sorted(base.iterdir(), reverse=True)[:5]:
            # Each filing directory contains the actual documents
            docs = list(filing_dir.glob("*.txt")) + list(filing_dir.glob("*.htm*"))
            filings.append({
                "accession": filing_dir.name,
                "documents": [d.name for d in docs[:3]],
                "path": str(filing_dir),
            })

    return {
        "ticker": ticker.upper(),
        "filing_type": filing_type,
        "filings": filings,
        "count": len(filings),
        "source": "SEC EDGAR",
    }


class SECProvider:
    async def search_filings(self, ticker: str, filing_type: str = "10-K") -> dict[str, Any]:
        return await asyncio.get_event_loop().run_in_executor(
            None, partial(_sync_search_filings, ticker, filing_type)
        )
