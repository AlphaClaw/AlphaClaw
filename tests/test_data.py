"""Tests for data providers."""

from __future__ import annotations

from alphaclaw.data.yfinance import YFinanceProvider
from alphaclaw.data.polygon import PolygonProvider
from alphaclaw.data.sec import SECProvider


def test_yfinance_provider_instantiates():
    provider = YFinanceProvider()
    assert provider is not None


def test_polygon_provider_instantiates():
    provider = PolygonProvider()
    assert provider is not None


def test_sec_provider_instantiates():
    provider = SECProvider()
    assert provider is not None
