"""Core agent loop — thin wrapper around PydanticAI agent.run()."""

from __future__ import annotations

import logging

from alphaclaw.agent.agent import Deps, agent
from alphaclaw.agent import tools as _tools  # noqa: F401 — registers @agent.tool decorators
from alphaclaw.config import settings
from alphaclaw.data.polygon import PolygonProvider
from alphaclaw.data.sec import SECProvider
from alphaclaw.data.yfinance import YFinanceProvider

log = logging.getLogger(__name__)

_market = PolygonProvider() if settings.polygon_api_key else YFinanceProvider()
_sec = SECProvider()


async def run(
    user_message: str,
    history: list | None = None,
    user_id: str | None = None,
) -> tuple[str, list]:
    """Run the agent loop.

    Returns (assistant_reply, updated_messages).
    """
    deps = Deps(user_id=user_id, market=_market, sec=_sec)
    result = await agent.run(
        user_message,
        model=settings.pydantic_ai_model,
        deps=deps,
        message_history=history or [],
    )
    return result.output, result.all_messages()
