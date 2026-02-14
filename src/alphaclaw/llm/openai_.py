"""OpenAI-compatible provider — works with OpenAI, Azure, Groq, Together, Ollama, vLLM."""

from __future__ import annotations

import logging
import os

from openai import AsyncOpenAI

from alphaclaw.llm.base import LLMError, LLMResult, ToolCall

log = logging.getLogger(__name__)

# Sub-provider configuration: prefix → (env key for API key, env key for base URL, default base URL)
_SUB_PROVIDERS: dict[str, tuple[str, str | None, str | None]] = {
    "openai": ("OPENAI_API_KEY", None, None),
    "azure": ("AZURE_API_KEY", "AZURE_API_BASE", None),
    "groq": ("GROQ_API_KEY", "GROQ_API_BASE", "https://api.groq.com/openai/v1"),
    "together": ("TOGETHER_API_KEY", "TOGETHER_API_BASE", "https://api.together.xyz/v1"),
    "ollama": (None, "OLLAMA_API_BASE", "http://localhost:11434/v1"),
    "vllm": (None, "VLLM_API_BASE", "http://localhost:8000/v1"),
}


class OpenAIProvider:
    """Provider for OpenAI and OpenAI-compatible APIs."""

    def __init__(self, prefix: str = "openai") -> None:
        self._prefix = prefix
        key_env, base_env, default_base = _SUB_PROVIDERS.get(
            prefix, ("OPENAI_API_KEY", None, None)
        )
        api_key = os.environ.get(key_env) if key_env else "not-needed"
        base_url = (
            os.environ.get(base_env) if base_env else None
        ) or default_base

        kwargs: dict = {}
        if api_key:
            kwargs["api_key"] = api_key
        if base_url:
            kwargs["base_url"] = base_url

        self._client = AsyncOpenAI(**kwargs)

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
            response = await self._client.chat.completions.create(**kwargs)
        except Exception as exc:
            raise LLMError(
                str(exc),
                provider=self._prefix,
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
