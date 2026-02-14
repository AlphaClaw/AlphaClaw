"""Base types for the multi-provider LLM abstraction."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class ToolCall:
    """A tool/function call requested by the LLM."""

    id: str
    name: str
    arguments: str  # JSON string

    def to_openai(self) -> dict:
        """Serialize to OpenAI function-call format (canonical internal format)."""
        return {
            "id": self.id,
            "type": "function",
            "function": {"name": self.name, "arguments": self.arguments},
        }


@dataclass(frozen=True, slots=True)
class LLMResult:
    """Normalized result from any LLM provider."""

    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    finish_reason: str = "stop"
    usage: dict[str, int] = field(default_factory=dict)
    raw: Any = None

    @property
    def has_tool_calls(self) -> bool:
        return len(self.tool_calls) > 0


class LLMError(Exception):
    """Exception raised by LLM providers."""

    def __init__(
        self,
        message: str,
        *,
        provider: str = "unknown",
        retryable: bool = False,
        raw: Any = None,
    ) -> None:
        super().__init__(message)
        self.provider = provider
        self.retryable = retryable
        self.raw = raw


class LLMProvider(Protocol):
    """Protocol that all LLM provider backends must implement."""

    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
    ) -> LLMResult: ...
