"""Core agent loop — send messages to LLM, handle tool calls, return response."""

from __future__ import annotations

import json
import logging

from alphaclaw.agent.prompts import SYSTEM_PROMPT
from alphaclaw.agent.tools import TOOL_SCHEMAS, execute_tool
from alphaclaw.llm import get_provider

log = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 10


async def run(
    user_message: str,
    history: list[dict] | None = None,
    user_id: str | None = None,
) -> tuple[str, list[dict]]:
    """Run the agent loop.

    Returns (assistant_reply, updated_messages).
    """
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    provider, model_id = get_provider()

    for _ in range(MAX_TOOL_ROUNDS):
        result = await provider.complete(
            model=model_id,
            messages=messages,
            tools=TOOL_SCHEMAS,
            temperature=0.3,
        )

        if result.has_tool_calls:
            # Rebuild assistant message in OpenAI format for history
            messages.append({
                "role": "assistant",
                "content": result.content or None,
                "tool_calls": [tc.to_openai() for tc in result.tool_calls],
            })
            for tc in result.tool_calls:
                log.info("Tool call: %s(%s)", tc.name, tc.arguments)
                args = json.loads(tc.arguments) if isinstance(tc.arguments, str) else tc.arguments
                tool_result = await execute_tool(tc.name, args, user_id=user_id)
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": tool_result})
            continue

        # Done — return the final text
        reply = result.content or ""
        messages.append({"role": "assistant", "content": reply})
        # Strip system prompt before returning history
        return reply, messages[1:]

    # Safety: if we hit max rounds, return whatever we have
    return "I'm having trouble completing this analysis. Please try a simpler question.", messages[1:]
