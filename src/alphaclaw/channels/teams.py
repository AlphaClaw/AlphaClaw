"""Microsoft Teams channel adapter."""

from __future__ import annotations

import logging

from botbuilder.core import BotFrameworkAdapter, BotFrameworkAdapterSettings, TurnContext
from botbuilder.schema import Activity

from alphaclaw.agent import loop as agent
from alphaclaw.config import settings

log = logging.getLogger(__name__)


class TeamsChannel:
    name = "teams"

    def __init__(self) -> None:
        self._adapter: BotFrameworkAdapter | None = None

    async def start(self) -> None:
        if not settings.teams_app_id or not settings.teams_app_password:
            log.info("Teams: no credentials configured, skipping")
            return

        adapter_settings = BotFrameworkAdapterSettings(
            app_id=settings.teams_app_id,
            app_password=settings.teams_app_password,
        )
        self._adapter = BotFrameworkAdapter(adapter_settings)
        log.info("Teams channel initialized (webhook mode — mount /api/teams on the web server)")

    async def process_activity(self, activity: Activity) -> str | None:
        """Process an incoming Teams activity. Called from the web server's webhook endpoint."""
        if not self._adapter:
            return None

        response_text: str | None = None

        async def _on_turn(turn_context: TurnContext):
            nonlocal response_text
            text = turn_context.activity.text or ""
            user_id = turn_context.activity.from_property.id or ""

            reply, _ = await agent.run(text, user_id=user_id, channel="teams")

            await turn_context.send_activity(Activity(type="message", text=reply))
            response_text = reply

        await self._adapter.process_activity(activity, "", _on_turn)
        return response_text

    async def stop(self) -> None:
        pass
