"""Core agent loop — thin wrapper around PydanticAI agent.run()."""

from __future__ import annotations

import logging

from pydantic_ai.messages import ModelMessagesTypeAdapter

from alphaclaw.agent.agent import Deps, agent
from alphaclaw.agent import tools as _tools  # noqa: F401 — registers @agent.tool decorators
from alphaclaw.config import settings
from alphaclaw.data.polygon import PolygonProvider
from alphaclaw.data.sec import SECProvider
from alphaclaw.data.yfinance import YFinanceProvider
from alphaclaw.storage.db import async_session
from alphaclaw.storage.repo import Repository

log = logging.getLogger(__name__)

_market = PolygonProvider() if settings.polygon_api_key else YFinanceProvider()
_sec = SECProvider()

_MAX_HISTORY = 40


async def run(
    user_message: str,
    history: list | None = None,
    user_id: str | None = None,
    channel: str = "web",
) -> tuple[str, list]:
    """Run the agent loop.

    Returns (assistant_reply, updated_messages).
    """
    async with async_session() as session:
        repo = Repository(session)
        deps = Deps(
            user_id=user_id,
            market=_market,
            sec=_sec,
            channel=channel,
            repo=repo,
        )

        # Load history from DB if not provided and user is known
        if history is None and user_id:
            try:
                conv = await repo.get_conversation(
                    (await repo.get_or_create_user(channel, user_id)).id,
                    channel,
                )
                if conv and conv.messages:
                    history = ModelMessagesTypeAdapter.validate_python(conv.messages)
            except Exception:
                log.debug("Failed to load history for %s, starting fresh", user_id)
                history = None

        result = await agent.run(
            user_message,
            model=settings.pydantic_ai_model,
            deps=deps,
            message_history=history or [],
        )

        messages = result.all_messages()

        # Persist conversation to DB
        if user_id:
            try:
                user = await repo.get_or_create_user(channel, user_id)
                serialized = ModelMessagesTypeAdapter.dump_python(
                    messages[-_MAX_HISTORY:], mode="json"
                )
                await repo.save_conversation(user.id, channel, serialized)
            except Exception:
                log.warning("Failed to persist history for %s", user_id, exc_info=True)

        return result.output, messages
