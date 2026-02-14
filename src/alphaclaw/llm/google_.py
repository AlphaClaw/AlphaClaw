"""Google Gemini provider — native SDK with parts/contents format conversion."""

from __future__ import annotations

import json
import logging
import os
import uuid

from google import genai
from google.genai import types

from alphaclaw.llm.base import LLMError, LLMResult, ToolCall

log = logging.getLogger(__name__)


class GeminiProvider:
    """Provider using the Google GenAI SDK."""

    def __init__(self, prefix: str = "gemini") -> None:
        self._prefix = prefix
        self._client = genai.Client(
            api_key=os.environ.get("GOOGLE_API_KEY"),
        )

    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
    ) -> LLMResult:
        system_text, contents = _convert_messages(messages)

        config_kwargs: dict = {"temperature": temperature}
        if system_text:
            config_kwargs["system_instruction"] = system_text

        gemini_tools = _convert_tools(tools) if tools else None
        if gemini_tools:
            config_kwargs["tools"] = gemini_tools

        config = types.GenerateContentConfig(**config_kwargs)

        try:
            response = await self._client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            raise LLMError(
                str(exc),
                provider="gemini",
                retryable="quota" in str(exc).lower() or "rate" in str(exc).lower(),
                raw=exc,
            ) from exc

        return _parse_response(response)


def _convert_messages(messages: list[dict]) -> tuple[str, list[types.Content]]:
    """Convert OpenAI-format messages to Gemini contents.

    Returns (system_text, contents).
    """
    system_parts: list[str] = []
    contents: list[types.Content] = []

    # Track function names by tool_call_id for tool result mapping
    fn_names: dict[str, str] = {}

    for msg in messages:
        role = msg.get("role", "")

        if role == "system":
            system_parts.append(msg.get("content", ""))
            continue

        if role == "user":
            contents.append(types.Content(
                role="user",
                parts=[types.Part.from_text(text=msg.get("content", ""))],
            ))
            continue

        if role == "assistant":
            parts: list[types.Part] = []
            if msg.get("content"):
                parts.append(types.Part.from_text(text=msg["content"]))
            for tc in msg.get("tool_calls", []):
                fn = tc.get("function", {})
                args_str = fn.get("arguments", "{}")
                args = json.loads(args_str) if isinstance(args_str, str) else args_str
                fn_names[tc["id"]] = fn["name"]
                parts.append(types.Part.from_function_call(
                    name=fn["name"],
                    args=args,
                ))
            contents.append(types.Content(role="model", parts=parts))
            continue

        if role == "tool":
            # Gemini needs function_response with the function name
            fn_name = fn_names.get(msg.get("tool_call_id", ""), "unknown")
            content_str = msg.get("content", "{}")
            try:
                output = json.loads(content_str)
            except (json.JSONDecodeError, TypeError):
                output = {"result": content_str}
            contents.append(types.Content(
                role="user",
                parts=[types.Part.from_function_response(
                    name=fn_name,
                    response=output,
                )],
            ))
            continue

    return "\n\n".join(system_parts), contents


def _convert_tools(tools: list[dict]) -> list[types.Tool]:
    """Convert OpenAI tool schemas to Gemini function declarations."""
    declarations = []
    for tool in tools:
        fn = tool.get("function", tool)
        params = fn.get("parameters", {"type": "object", "properties": {}})
        # Strip 'default' keys — Gemini doesn't support them
        clean_params = _strip_defaults(params)
        declarations.append(types.FunctionDeclaration(
            name=fn["name"],
            description=fn.get("description", ""),
            parameters=clean_params,
        ))
    return [types.Tool(function_declarations=declarations)]


def _strip_defaults(schema: dict) -> dict:
    """Recursively remove 'default' keys from a JSON schema (unsupported by Gemini)."""
    result = {}
    for k, v in schema.items():
        if k == "default":
            continue
        if isinstance(v, dict):
            result[k] = _strip_defaults(v)
        elif isinstance(v, list):
            result[k] = [_strip_defaults(item) if isinstance(item, dict) else item for item in v]
        else:
            result[k] = v
    return result


def _parse_response(response: types.GenerateContentResponse) -> LLMResult:
    """Parse a Gemini response into LLMResult."""
    content_parts: list[str] = []
    tool_calls: list[ToolCall] = []

    if response.candidates:
        candidate = response.candidates[0]
        if candidate.content and candidate.content.parts:
            for part in candidate.content.parts:
                if part.text:
                    content_parts.append(part.text)
                elif part.function_call:
                    fc = part.function_call
                    tool_calls.append(
                        ToolCall(
                            id=uuid.uuid4().hex[:24],
                            name=fc.name,
                            arguments=json.dumps(dict(fc.args) if fc.args else {}),
                        )
                    )

    # Determine finish reason
    finish_reason = "stop"
    if tool_calls:
        finish_reason = "tool_calls"
    elif response.candidates:
        candidate = response.candidates[0]
        fr = getattr(candidate, "finish_reason", None)
        if fr and str(fr) == "MAX_TOKENS":
            finish_reason = "length"

    usage_data = {}
    if response.usage_metadata:
        um = response.usage_metadata
        usage_data = {
            "prompt_tokens": getattr(um, "prompt_token_count", 0) or 0,
            "completion_tokens": getattr(um, "candidates_token_count", 0) or 0,
            "total_tokens": getattr(um, "total_token_count", 0) or 0,
        }

    return LLMResult(
        content="\n".join(content_parts),
        tool_calls=tool_calls,
        finish_reason=finish_reason,
        usage=usage_data,
        raw=response,
    )
