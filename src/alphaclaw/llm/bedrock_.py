"""AWS Bedrock provider — Converse API via boto3 (sync→async executor)."""

from __future__ import annotations

import asyncio
import json
import logging
from functools import partial
from typing import Any

import boto3

from alphaclaw.llm.base import LLMError, LLMResult, ToolCall

log = logging.getLogger(__name__)


class BedrockProvider:
    """Provider using AWS Bedrock Converse API."""

    def __init__(self, prefix: str = "bedrock") -> None:
        self._prefix = prefix
        self._client = boto3.client("bedrock-runtime")

    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
    ) -> LLMResult:
        system_blocks, converse_msgs = _convert_messages(messages)

        kwargs: dict = {
            "modelId": model,
            "messages": converse_msgs,
            "inferenceConfig": {"temperature": temperature, "maxTokens": 4096},
        }
        if system_blocks:
            kwargs["system"] = system_blocks
        if tools:
            kwargs["toolConfig"] = {"tools": _convert_tools(tools)}

        loop = asyncio.get_running_loop()
        try:
            response = await loop.run_in_executor(
                None, partial(self._client.converse, **kwargs)
            )
        except Exception as exc:
            raise LLMError(
                str(exc),
                provider="bedrock",
                retryable="throttl" in str(exc).lower(),
                raw=exc,
            ) from exc

        return _parse_response(response)


def _convert_messages(messages: list[dict]) -> tuple[list[dict], list[dict]]:
    """Convert OpenAI-format messages to Bedrock Converse format.

    Returns (system_blocks, converse_messages).
    """
    system_blocks: list[dict] = []
    converse_msgs: list[dict] = []

    for msg in messages:
        role = msg.get("role", "")

        if role == "system":
            system_blocks.append({"text": msg.get("content", "")})
            continue

        if role == "user":
            converse_msgs.append({
                "role": "user",
                "content": [{"text": msg.get("content", "")}],
            })
            continue

        if role == "assistant":
            content: list[dict] = []
            if msg.get("content"):
                content.append({"text": msg["content"]})
            for tc in msg.get("tool_calls", []):
                fn = tc.get("function", {})
                args_str = fn.get("arguments", "{}")
                args = json.loads(args_str) if isinstance(args_str, str) else args_str
                content.append({
                    "toolUse": {
                        "toolUseId": tc["id"],
                        "name": fn["name"],
                        "input": args,
                    }
                })
            converse_msgs.append({"role": "assistant", "content": content})
            continue

        if role == "tool":
            content_str = msg.get("content", "{}")
            try:
                output = json.loads(content_str)
            except (json.JSONDecodeError, TypeError):
                output = {"result": content_str}
            converse_msgs.append({
                "role": "user",
                "content": [{
                    "toolResult": {
                        "toolUseId": msg.get("tool_call_id", ""),
                        "content": [{"json": output}],
                    }
                }],
            })
            continue

    return system_blocks, converse_msgs


def _convert_tools(tools: list[dict]) -> list[dict]:
    """Convert OpenAI tool schemas to Bedrock Converse toolSpec format."""
    result = []
    for tool in tools:
        fn = tool.get("function", tool)
        result.append({
            "toolSpec": {
                "name": fn["name"],
                "description": fn.get("description", ""),
                "inputSchema": {
                    "json": fn.get("parameters", {"type": "object", "properties": {}}),
                },
            }
        })
    return result


def _parse_response(response: dict[str, Any]) -> LLMResult:
    """Parse a Bedrock Converse response into LLMResult."""
    content_parts: list[str] = []
    tool_calls: list[ToolCall] = []

    for block in response.get("output", {}).get("message", {}).get("content", []):
        if "text" in block:
            content_parts.append(block["text"])
        elif "toolUse" in block:
            tu = block["toolUse"]
            tool_calls.append(
                ToolCall(
                    id=tu["toolUseId"],
                    name=tu["name"],
                    arguments=json.dumps(tu.get("input", {})),
                )
            )

    stop_reason = response.get("stopReason", "end_turn")
    finish_reason = "stop"
    if stop_reason == "tool_use":
        finish_reason = "tool_calls"
    elif stop_reason == "max_tokens":
        finish_reason = "length"

    usage_data = {}
    usage = response.get("usage", {})
    if usage:
        usage_data = {
            "prompt_tokens": usage.get("inputTokens", 0),
            "completion_tokens": usage.get("outputTokens", 0),
            "total_tokens": usage.get("inputTokens", 0) + usage.get("outputTokens", 0),
        }

    return LLMResult(
        content="\n".join(content_parts),
        tool_calls=tool_calls,
        finish_reason=finish_reason,
        usage=usage_data,
        raw=response,
    )
