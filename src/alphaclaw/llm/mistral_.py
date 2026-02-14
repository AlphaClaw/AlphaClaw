"""Mistral provider — native SDK (near-identical to OpenAI format)."""

from __future__ import annotations

import logging
import os

from mistralai import Mistral

from alphaclaw.llm.base import LLMError, LLMResult, ToolCall

log = logging.getLogger(__name__)


class MistralProvider:
    """Provider using the Mistral SDK."""

    def __init__(self, prefix: str = "mistral") -> None:
        self._prefix = prefix
        self._client = Mistral(
            api_key=os.environ.get("MISTRAL_API_KEY", ""),
        )

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
            response = await self._client.chat.complete_async(**kwargs)
        except Exception as exc:
            raise LLMError(
                str(exc),
                provider="mistral",
                retryable="rate" in str(exc).lower(),
                raw=exc,
            ) from exc

        if not response or not response.choices:
            raise LLMError("Empty response from Mistral", provider="mistral")

        choice = response.choices[0]
        msg = choice.message

        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=tc.function.arguments if isinstance(tc.function.arguments, str) else "{}",
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
