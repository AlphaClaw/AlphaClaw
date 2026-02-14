"""Tests for provider-specific message/tool format conversions."""

from __future__ import annotations

import json

import pytest


class TestAnthropicConversion:
    def test_system_extraction(self):
        from alphaclaw.llm.anthropic_ import _convert_messages

        messages = [
            {"role": "system", "content": "You are a helper."},
            {"role": "user", "content": "Hi"},
        ]
        system_text, msgs = _convert_messages(messages)
        assert system_text == "You are a helper."
        assert len(msgs) == 1
        assert msgs[0]["role"] == "user"

    def test_tool_calls_to_content_blocks(self):
        from alphaclaw.llm.anthropic_ import _convert_messages

        messages = [
            {
                "role": "assistant",
                "content": "Let me check.",
                "tool_calls": [
                    {
                        "id": "call_1",
                        "type": "function",
                        "function": {
                            "name": "get_quote",
                            "arguments": '{"ticker": "AAPL"}',
                        },
                    }
                ],
            }
        ]
        _, msgs = _convert_messages(messages)
        assert len(msgs) == 1
        blocks = msgs[0]["content"]
        assert blocks[0]["type"] == "text"
        assert blocks[0]["text"] == "Let me check."
        assert blocks[1]["type"] == "tool_use"
        assert blocks[1]["id"] == "call_1"
        assert blocks[1]["name"] == "get_quote"
        assert blocks[1]["input"] == {"ticker": "AAPL"}

    def test_tool_results_coalesced(self):
        from alphaclaw.llm.anthropic_ import _convert_messages

        messages = [
            {"role": "tool", "tool_call_id": "call_1", "content": '{"price": 150}'},
            {"role": "tool", "tool_call_id": "call_2", "content": '{"price": 200}'},
        ]
        _, msgs = _convert_messages(messages)
        # Consecutive tool results → single user message
        assert len(msgs) == 1
        assert msgs[0]["role"] == "user"
        assert len(msgs[0]["content"]) == 2
        assert msgs[0]["content"][0]["type"] == "tool_result"
        assert msgs[0]["content"][1]["type"] == "tool_result"

    def test_tool_schema_conversion(self):
        from alphaclaw.llm.anthropic_ import _convert_tools

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_quote",
                    "description": "Get a stock quote.",
                    "parameters": {
                        "type": "object",
                        "properties": {"ticker": {"type": "string"}},
                        "required": ["ticker"],
                    },
                },
            }
        ]
        result = _convert_tools(tools)
        assert len(result) == 1
        assert result[0]["name"] == "get_quote"
        assert result[0]["description"] == "Get a stock quote."
        assert "input_schema" in result[0]
        assert result[0]["input_schema"]["type"] == "object"


class TestBedrockConversion:
    def test_system_extraction(self):
        from alphaclaw.llm.bedrock_ import _convert_messages

        messages = [
            {"role": "system", "content": "You are a helper."},
            {"role": "user", "content": "Hi"},
        ]
        system_blocks, msgs = _convert_messages(messages)
        assert len(system_blocks) == 1
        assert system_blocks[0]["text"] == "You are a helper."
        assert len(msgs) == 1
        assert msgs[0]["content"][0]["text"] == "Hi"

    def test_tool_calls_to_tool_use(self):
        from alphaclaw.llm.bedrock_ import _convert_messages

        messages = [
            {
                "role": "assistant",
                "content": "Checking...",
                "tool_calls": [
                    {
                        "id": "call_1",
                        "type": "function",
                        "function": {"name": "get_quote", "arguments": '{"ticker": "AAPL"}'},
                    }
                ],
            }
        ]
        _, msgs = _convert_messages(messages)
        content = msgs[0]["content"]
        assert content[0]["text"] == "Checking..."
        assert content[1]["toolUse"]["name"] == "get_quote"
        assert content[1]["toolUse"]["toolUseId"] == "call_1"

    def test_tool_results(self):
        from alphaclaw.llm.bedrock_ import _convert_messages

        messages = [
            {"role": "tool", "tool_call_id": "call_1", "content": '{"price": 150}'},
        ]
        _, msgs = _convert_messages(messages)
        assert msgs[0]["role"] == "user"
        tool_result = msgs[0]["content"][0]["toolResult"]
        assert tool_result["toolUseId"] == "call_1"
        assert tool_result["content"][0]["json"] == {"price": 150}

    def test_tool_schema_conversion(self):
        from alphaclaw.llm.bedrock_ import _convert_tools

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_quote",
                    "description": "Get quote.",
                    "parameters": {"type": "object", "properties": {"ticker": {"type": "string"}}},
                },
            }
        ]
        result = _convert_tools(tools)
        assert result[0]["toolSpec"]["name"] == "get_quote"
        assert "inputSchema" in result[0]["toolSpec"]


class TestGeminiConversion:
    def test_role_mapping(self):
        from alphaclaw.llm.google_ import _convert_messages

        messages = [
            {"role": "system", "content": "System prompt."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]
        system_text, contents = _convert_messages(messages)
        assert system_text == "System prompt."
        assert len(contents) == 2
        assert contents[0].role == "user"
        assert contents[1].role == "model"

    def test_strip_defaults(self):
        from alphaclaw.llm.google_ import _strip_defaults

        schema = {
            "type": "object",
            "properties": {
                "ticker": {"type": "string", "default": "AAPL"},
                "period": {"type": "string", "description": "time", "default": "1mo"},
            },
        }
        result = _strip_defaults(schema)
        assert "default" not in result["properties"]["ticker"]
        assert "default" not in result["properties"]["period"]
        assert result["properties"]["period"]["description"] == "time"
