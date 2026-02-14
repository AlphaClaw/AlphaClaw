"""Slack channel adapter using Bolt."""

from __future__ import annotations

import asyncio
import logging

from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
from slack_bolt.async_app import AsyncApp

from alphaclaw.agent import loop as agent
from alphaclaw.config import settings

log = logging.getLogger(__name__)

_histories: dict[str, list] = {}


class SlackChannel:
    name = "slack"

    def __init__(self) -> None:
        self._handler: AsyncSocketModeHandler | None = None

    async def start(self) -> None:
        if not settings.slack_bot_token or not settings.slack_app_token:
            log.info("Slack: no tokens configured, skipping")
            return

        app = AsyncApp(token=settings.slack_bot_token)

        @app.event("app_mention")
        async def handle_mention(event, say):
            await self._handle(event, say)

        @app.event("message")
        async def handle_dm(event, say):
            # Only respond to DMs (channel type 'im')
            if event.get("channel_type") == "im":
                await self._handle(event, say)

        self._handler = AsyncSocketModeHandler(app, settings.slack_app_token)
        asyncio.create_task(self._handler.start_async())
        log.info("Slack channel started")

    async def _handle(self, event: dict, say) -> None:
        user_id = event.get("user", "")
        text = event.get("text", "")
        if not text or not user_id:
            return

        history = _histories.get(user_id, [])
        reply, history = await agent.run(text, history=history, user_id=user_id)
        _histories[user_id] = history[-40:]

        await say(reply)

    async def stop(self) -> None:
        if self._handler:
            await self._handler.close_async()
