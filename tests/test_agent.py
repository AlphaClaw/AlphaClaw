"""Tests for the PydanticAI agent and tools."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from pydantic_ai import models
from pydantic_ai.models.test import TestModel

from alphaclaw.agent.agent import Deps, agent
from alphaclaw.agent import tools as _tools  # noqa: F401 — register tools

# Prevent accidental real LLM calls in tests
models.ALLOW_MODEL_REQUESTS = False


def _make_deps(user_id: str | None = "test-user") -> Deps:
    market = AsyncMock()
    sec = AsyncMock()
    from alphaclaw.storage.repo import Repository
    repo = AsyncMock(spec=Repository)
    return Deps(user_id=user_id, market=market, sec=sec, channel="test", repo=repo)


@pytest.mark.asyncio
async def test_agent_has_10_tools():
    """Agent should have all 10 tools registered."""
    m = TestModel(call_tools=[], custom_output_text="ok")
    with agent.override(model=m):
        await agent.run("test", model=m, deps=_make_deps())
    tool_names = sorted(
        t.name for t in m.last_model_request_parameters.function_tools
    )
    assert len(tool_names) == 10
    assert tool_names == sorted([
        "get_quote",
        "get_historical",
        "get_earnings",
        "get_company_info",
        "search_news",
        "search_filings",
        "get_watchlist",
        "update_watchlist",
        "compare_performance",
        "get_latest_brief",
    ])


@pytest.mark.asyncio
async def test_get_quote_calls_provider():
    """get_quote calls the market provider and returns its data."""
    deps = _make_deps()
    deps.market.get_quote = AsyncMock(return_value={"ticker": "AAPL", "price": 150.0})

    m = TestModel(call_tools=["get_quote"], custom_output_text="AAPL is $150")
    with agent.override(model=m):
        result = await agent.run("What is AAPL price?", model=m, deps=deps)
    assert result.output == "AAPL is $150"
    deps.market.get_quote.assert_called_once()


@pytest.mark.asyncio
async def test_custom_output():
    """Agent returns custom output text from TestModel."""
    m = TestModel(call_tools=[], custom_output_text="Hello from test")
    with agent.override(model=m):
        result = await agent.run("Hi", model=m, deps=_make_deps())
    assert result.output == "Hello from test"


@pytest.mark.asyncio
async def test_run_with_history():
    """Agent accepts message_history and returns messages."""
    m = TestModel(call_tools=[], custom_output_text="response")
    with agent.override(model=m):
        result = await agent.run("follow up", model=m, deps=_make_deps(), message_history=[])
    assert result.output == "response"
    assert len(result.all_messages()) > 0
