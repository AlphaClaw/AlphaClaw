"""Daily market brief pipeline."""

from __future__ import annotations

import logging

from alphaclaw.agent import loop as agent

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
    """Generate the daily market brief using the agent."""
    log.info("Generating daily market brief")
    reply, _ = await agent.run(BRIEF_PROMPT)
    return reply
