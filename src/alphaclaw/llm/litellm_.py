"""LiteLLM provider — wraps litellm.acompletion as fallback for any model string."""

from __future__ import annotations

import logging

import litellm

from alphaclaw.llm.base import LLMError, LLMResult, ToolCall

log = logging.getLogger(__name__)


class LiteLLMProvider:
    """Fallback provider using LiteLLM (supports 100+ model providers)."""

    def __init__(self, prefix: str = "litellm") -> None:
        self._prefix = prefix

    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
    ) -> LLMResult:
        kwargs: dict = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools

        try:
            response = await litellm.acompletion(**kwargs)
        except Exception as exc:
            raise LLMError(
                str(exc),
                provider="litellm",
                retryable="rate" in str(exc).lower(),
                raw=exc,
            ) from exc

        choice = response.choices[0]
        msg = choice.message

        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=tc.function.arguments or "{}",
                    )
                )

        usage_data = {}
        if response.usage:
            usage_data = {
                "prompt_tokens": response.usage.prompt_tokens or 0,
                "completion_tokens": response.usage.completion_tokens or 0,
                "total_tokens": response.usage.total_tokens or 0,
            }

        return LLMResult(
            content=msg.content or "",
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason or "stop",
            usage=usage_data,
            raw=response,
        )
