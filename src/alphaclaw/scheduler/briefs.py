"""Daily market brief pipeline."""

from __future__ import annotations

import logging

from alphaclaw.agent import loop as agent
from alphaclaw.storage.db import async_session
from alphaclaw.storage.repo import Repository

log = logging.getLogger(__name__)

BRIEF_PROMPT = """\
Generate a concise daily market brief covering:
1. Major index performance (S&P 500, Nasdaq, Dow)
2. Notable movers (biggest gainers/losers in S&P 500)
3. Key economic events or earnings today
4. Sector trends

Use your tools to get real data. Format for chat readability.
Keep it under 500 words.
"""


async def generate_brief() -> str:
    """Generate the daily market brief using the agent and persist it."""
    log.info("Generating daily market brief")
    reply, _ = await agent.run(BRIEF_PROMPT)

    async with async_session() as session:
        repo = Repository(session)
        await repo.save_brief(reply)
    log.info("Daily brief saved to database")

    return reply
