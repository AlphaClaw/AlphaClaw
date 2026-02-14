"""Anthropic provider — native SDK with message/tool format conversion."""

from __future__ import annotations

import json
import logging
import os

import anthropic

from alphaclaw.llm.base import LLMError, LLMResult, ToolCall

log = logging.getLogger(__name__)

_DEFAULT_MAX_TOKENS = 4096


class AnthropicProvider:
    """Provider using the Anthropic SDK directly."""

    def __init__(self, prefix: str = "anthropic") -> None:
        self._prefix = prefix
        self._client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY"),
        )

    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
    ) -> LLMResult:
        system_text, converted_msgs = _convert_messages(messages)

        kwargs: dict = {
            "model": model,
            "messages": converted_msgs,
            "max_tokens": _DEFAULT_MAX_TOKENS,
            "temperature": temperature,
        }
        if system_text:
            kwargs["system"] = system_text
        if tools:
            kwargs["tools"] = _convert_tools(tools)

        try:
            response = await self._client.messages.create(**kwargs)
        except Exception as exc:
            raise LLMError(
                str(exc),
                provider="anthropic",
                retryable="rate" in str(exc).lower() or "overloaded" in str(exc).lower(),
                raw=exc,
            ) from exc

        return _parse_response(response)


def _convert_messages(messages: list[dict]) -> tuple[str, list[dict]]:
    """Convert OpenAI-format messages to Anthropic format.

    Returns (system_text, anthropic_messages).
    """
    system_parts: list[str] = []
    anthropic_msgs: list[dict] = []

    i = 0
    while i < len(messages):
        msg = messages[i]
        role = msg.get("role", "")

        if role == "system":
            system_parts.append(msg.get("content", ""))
            i += 1
            continue

        if role == "user":
            anthropic_msgs.append({"role": "user", "content": msg["content"]})
            i += 1
            continue

        if role == "assistant":
            content_blocks: list[dict] = []
            if msg.get("content"):
                content_blocks.append({"type": "text", "text": msg["content"]})
            # Convert tool_calls to tool_use content blocks
            for tc in msg.get("tool_calls", []):
                fn = tc.get("function", {})
                args = fn.get("arguments", "{}")
                if isinstance(args, str):
                    args = json.loads(args)
                content_blocks.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": fn["name"],
                    "input": args,
                })
            anthropic_msgs.append({"role": "assistant", "content": content_blocks})
            i += 1
            continue

        if role == "tool":
            # Collect consecutive tool messages into a single user message
            tool_results: list[dict] = []
            while i < len(messages) and messages[i].get("role") == "tool":
                tool_msg = messages[i]
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_msg["tool_call_id"],
                    "content": tool_msg.get("content", ""),
                })
                i += 1
            anthropic_msgs.append({"role": "user", "content": tool_results})
            continue

        # Unknown role — skip
        i += 1

    return "\n\n".join(system_parts), anthropic_msgs


def _convert_tools(tools: list[dict]) -> list[dict]:
    """Convert OpenAI function-calling tool schemas to Anthropic format."""
    result = []
    for tool in tools:
        fn = tool.get("function", tool)
        result.append({
            "name": fn["name"],
            "description": fn.get("description", ""),
            "input_schema": fn.get("parameters", {"type": "object", "properties": {}}),
        })
    return result


def _parse_response(response: anthropic.types.Message) -> LLMResult:
    """Parse an Anthropic response into LLMResult."""
    content_parts: list[str] = []
    tool_calls: list[ToolCall] = []

    for block in response.content:
        if block.type == "text":
            content_parts.append(block.text)
        elif block.type == "tool_use":
            tool_calls.append(
                ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=json.dumps(block.input),
                )
            )

    # Map Anthropic stop reasons to OpenAI-style finish reasons
    finish_reason = "stop"
    if response.stop_reason == "tool_use":
        finish_reason = "tool_calls"
    elif response.stop_reason == "max_tokens":
        finish_reason = "length"

    usage_data = {
        "prompt_tokens": response.usage.input_tokens,
        "completion_tokens": response.usage.output_tokens,
        "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
    }

    return LLMResult(
        content="\n".join(content_parts),
        tool_calls=tool_calls,
        finish_reason=finish_reason,
        usage=usage_data,
        raw=response,
    )
