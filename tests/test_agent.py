"""Tests for the agent loop and tools."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from alphaclaw.agent.tools import TOOL_SCHEMAS, execute_tool


def test_tool_schemas_valid():
    """All tool schemas have required fields."""
    assert len(TOOL_SCHEMAS) == 9
    for schema in TOOL_SCHEMAS:
        assert schema["type"] == "function"
        fn = schema["function"]
        assert "name" in fn
        assert "description" in fn
        assert "parameters" in fn


def test_tool_names_unique():
    """All tool names are unique."""
    names = [s["function"]["name"] for s in TOOL_SCHEMAS]
    assert len(names) == len(set(names))


@pytest.mark.asyncio
async def test_execute_unknown_tool():
    """Unknown tool returns error."""
    result = await execute_tool("nonexistent", {})
    assert "error" in result
    assert "Unknown tool" in result


@pytest.mark.asyncio
async def test_execute_get_quote():
    """get_quote calls the market provider."""
    mock_data = {"ticker": "AAPL", "price": 150.0, "source": "test"}
    with patch("alphaclaw.agent.tools._market") as mock_market:
        mock_market.get_quote = AsyncMock(return_value=mock_data)
        result = await execute_tool("get_quote", {"ticker": "AAPL"})
        assert "AAPL" in result
        assert "150.0" in result


@pytest.mark.asyncio
async def test_execute_tool_exception():
    """Tool exceptions are caught and returned as errors."""
    with patch("alphaclaw.agent.tools._market") as mock_market:
        mock_market.get_quote = AsyncMock(side_effect=ValueError("API down"))
        result = await execute_tool("get_quote", {"ticker": "AAPL"})
        assert "error" in result
        assert "API down" in result
