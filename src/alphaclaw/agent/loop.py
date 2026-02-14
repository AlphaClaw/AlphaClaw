"""Core agent loop — send messages to LLM, handle tool calls, return response."""

from __future__ import annotations

import json
import logging

import litellm

from alphaclaw.agent.prompts import SYSTEM_PROMPT
from alphaclaw.agent.tools import TOOL_SCHEMAS, execute_tool
from alphaclaw.config import settings

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

    for _ in range(MAX_TOOL_ROUNDS):
        response = await litellm.acompletion(
            model=settings.model,
            messages=messages,
            tools=TOOL_SCHEMAS,
            temperature=0.3,
        )
        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" or choice.message.tool_calls:
            messages.append(choice.message.model_dump())
            for tool_call in choice.message.tool_calls:
                fn = tool_call.function
                log.info("Tool call: %s(%s)", fn.name, fn.arguments)
                args = json.loads(fn.arguments) if isinstance(fn.arguments, str) else fn.arguments
                result = await execute_tool(fn.name, args, user_id=user_id)
                messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})
            continue

        # Done — return the final text
        reply = choice.message.content or ""
        messages.append({"role": "assistant", "content": reply})
        # Strip system prompt before returning history
        return reply, messages[1:]

    # Safety: if we hit max rounds, return whatever we have
    return "I'm having trouble completing this analysis. Please try a simpler question.", messages[1:]
