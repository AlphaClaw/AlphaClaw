"""Channel protocol — interface for messaging adapters."""

from __future__ import annotations

from typing import Protocol


class Channel(Protocol):
    """A messaging channel that receives user messages and sends replies."""

    name: str

    async def start(self) -> None:
        """Start the channel (connect, listen, etc.)."""
        ...

    async def stop(self) -> None:
        """Gracefully stop the channel."""
        ...
