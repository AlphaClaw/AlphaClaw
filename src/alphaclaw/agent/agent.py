"""PydanticAI agent definition and dependency container."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from pydantic_ai import Agent

from alphaclaw.agent.prompts import SYSTEM_PROMPT
from alphaclaw.data.base import DataProvider

if TYPE_CHECKING:
    from alphaclaw.storage.repo import Repository


class SECProviderProtocol:
    async def search_filings(self, ticker: str, filing_type: str = "10-K") -> dict[str, Any]: ...


@dataclass
class Deps:
    user_id: str | None
    market: DataProvider
    sec: SECProviderProtocol
    channel: str = "web"
    repo: Repository | None = None


# Model is not set here to avoid API key validation at import time.
# The model is passed at run time in loop.py via agent.run(model=...).
agent: Agent[Deps, str] = Agent(
    deps_type=Deps,
    instructions=SYSTEM_PROMPT,
)
