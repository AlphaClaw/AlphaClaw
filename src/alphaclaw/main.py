"""AlphaClaw entry point — starts all channels + scheduler."""

from __future__ import annotations

import asyncio
import logging

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from alphaclaw.channels.discord_ import DiscordChannel
from alphaclaw.channels.slack_ import SlackChannel
from alphaclaw.channels.telegram import TelegramChannel
from alphaclaw.channels.teams import TeamsChannel
from alphaclaw.channels.web import app as web_app
from alphaclaw.config import settings
from alphaclaw.scheduler.briefs import generate_brief

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s — %(message)s")
log = logging.getLogger("alphaclaw")


async def _run_brief() -> None:
    try:
        brief = await generate_brief()
        log.info("Daily brief generated (%d chars)", len(brief))
        # TODO: push brief to subscribed channels
    except Exception:
        log.exception("Failed to generate daily brief")


async def start() -> None:
    log.info("Starting AlphaClaw")

    # Start chat channels
    channels = [TelegramChannel(), DiscordChannel(), SlackChannel(), TeamsChannel()]
    for ch in channels:
        await ch.start()

    # Start scheduler
    scheduler = AsyncIOScheduler()
    parts = settings.brief_cron.split()
    if len(parts) == 5:
        trigger = CronTrigger(
            minute=parts[0],
            hour=parts[1],
            day=parts[2],
            month=parts[3],
            day_of_week=parts[4],
            timezone=settings.brief_timezone,
        )
        scheduler.add_job(_run_brief, trigger, id="daily_brief")
        scheduler.start()
        log.info("Scheduler started (brief cron: %s %s)", settings.brief_cron, settings.brief_timezone)

    # Start web server (blocks)
    config = uvicorn.Config(web_app, host=settings.web_host, port=settings.web_port, log_level="info")
    server = uvicorn.Server(config)
    try:
        await server.serve()
    finally:
        scheduler.shutdown(wait=False)
        for ch in channels:
            await ch.stop()


def main() -> None:
    asyncio.run(start())


if __name__ == "__main__":
    main()
