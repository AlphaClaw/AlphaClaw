"""Discord channel adapter."""

from __future__ import annotations

import asyncio
import logging

import discord

from alphaclaw.agent import loop as agent
from alphaclaw.config import settings

log = logging.getLogger(__name__)


class _Bot(discord.Client):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(intents=intents)

    async def on_ready(self) -> None:
        log.info("Discord bot connected as %s", self.user)

    async def on_message(self, message: discord.Message) -> None:
        if message.author == self.user or message.author.bot:
            return

        # Only respond to DMs or mentions
        if not isinstance(message.channel, discord.DMChannel) and self.user not in message.mentions:
            return

        text = message.clean_content
        # Strip the bot mention from the beginning if present
        if self.user and text.startswith(f"@{self.user.display_name}"):
            text = text[len(f"@{self.user.display_name}") :].strip()

        user_id = message.author.id

        async with message.channel.typing():
            reply, _ = await agent.run(text, user_id=str(user_id), channel="discord")

        # Discord has a 2000 char limit
        for i in range(0, len(reply), 1990):
            await message.reply(reply[i : i + 1990])


class DiscordChannel:
    name = "discord"

    def __init__(self) -> None:
        self._bot: _Bot | None = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if not settings.discord_bot_token:
            log.info("Discord: no token configured, skipping")
            return
        self._bot = _Bot()
        self._task = asyncio.create_task(self._bot.start(settings.discord_bot_token))
        log.info("Discord channel started")

    async def stop(self) -> None:
        if self._bot:
            await self._bot.close()
        if self._task:
            self._task.cancel()
