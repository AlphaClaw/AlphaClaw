"""Telegram channel adapter."""

from __future__ import annotations

import logging

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

from alphaclaw.agent import loop as agent
from alphaclaw.config import settings

log = logging.getLogger(__name__)


async def _start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hey! I'm AlphaClaw, your financial copilot.\n\n"
        "Ask me about stocks, earnings, SEC filings, or market news. "
        "Try: \"How is AAPL doing today?\""
    )


async def _handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    text = update.message.text
    if not text:
        return

    reply, _ = await agent.run(text, user_id=str(user_id), channel="telegram")

    # Telegram has a 4096 char limit per message
    for i in range(0, len(reply), 4000):
        await update.message.reply_text(reply[i : i + 4000])


class TelegramChannel:
    name = "telegram"

    def __init__(self) -> None:
        self._app: Application | None = None

    async def start(self) -> None:
        if not settings.telegram_bot_token:
            log.info("Telegram: no token configured, skipping")
            return
        self._app = Application.builder().token(settings.telegram_bot_token).build()
        self._app.add_handler(CommandHandler("start", _start))
        self._app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _handle_message))
        await self._app.initialize()
        await self._app.start()
        await self._app.updater.start_polling()
        log.info("Telegram channel started")

    async def stop(self) -> None:
        if self._app:
            await self._app.updater.stop()
            await self._app.stop()
            await self._app.shutdown()
