"""Tests for the LLM registry — model string parsing and provider routing."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from alphaclaw.llm.base import LLMResult, ToolCall
from alphaclaw.llm.registry import clear_cache, get_provider, parse_model_string


@pytest.fixture(autouse=True)
def _clear_provider_cache():
    """Clear the provider cache before each test."""
    clear_cache()
    yield
    clear_cache()


class TestParseModelString:
    def test_with_prefix(self):
        prefix, model_id = parse_model_string("anthropic/claude-sonnet-4-5-20250929")
        assert prefix == "anthropic"
        assert model_id == "claude-sonnet-4-5-20250929"

    def test_openai_prefix(self):
        prefix, model_id = parse_model_string("openai/gpt-4o")
        assert prefix == "openai"
        assert model_id == "gpt-4o"

    def test_no_prefix(self):
        prefix, model_id = parse_model_string("gpt-4o")
        assert prefix == ""
        assert model_id == "gpt-4o"

    def test_gemini_prefix(self):
        prefix, model_id = parse_model_string("gemini/gemini-2.0-flash")
        assert prefix == "gemini"
        assert model_id == "gemini-2.0-flash"

    def test_bedrock_prefix(self):
        prefix, model_id = parse_model_string("bedrock/anthropic.claude-3-sonnet")
        assert prefix == "bedrock"
        assert model_id == "anthropic.claude-3-sonnet"

    def test_case_insensitive_prefix(self):
        prefix, model_id = parse_model_string("OpenAI/gpt-4o")
        assert prefix == "openai"
        assert model_id == "gpt-4o"

    def test_multiple_slashes(self):
        prefix, model_id = parse_model_string("together/meta-llama/Llama-3-70b")
        assert prefix == "together"
        assert model_id == "meta-llama/Llama-3-70b"


class TestGetProvider:
    def test_litellm_fallback_no_prefix(self):
        """No prefix → LiteLLM fallback."""
        provider, model_id = get_provider("gpt-4o")
        from alphaclaw.llm.litellm_ import LiteLLMProvider

        assert isinstance(provider, LiteLLMProvider)
        assert model_id == "gpt-4o"

    def test_litellm_fallback_unknown_prefix(self):
        """Unknown prefix → LiteLLM fallback with full string."""
        provider, model_id = get_provider("unknown-provider/some-model")
        from alphaclaw.llm.litellm_ import LiteLLMProvider

        assert isinstance(provider, LiteLLMProvider)
        assert model_id == "unknown-provider/some-model"

    def test_openai_provider(self):
        """openai/ prefix → OpenAIProvider."""
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            provider, model_id = get_provider("openai/gpt-4o")

        from alphaclaw.llm.openai_ import OpenAIProvider

        assert isinstance(provider, OpenAIProvider)
        assert model_id == "gpt-4o"

    def test_anthropic_provider(self):
        """anthropic/ prefix → AnthropicProvider."""
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            provider, model_id = get_provider("anthropic/claude-sonnet-4-5-20250929")

        from alphaclaw.llm.anthropic_ import AnthropicProvider

        assert isinstance(provider, AnthropicProvider)
        assert model_id == "claude-sonnet-4-5-20250929"

    def test_groq_uses_openai_provider(self):
        """groq/ prefix → OpenAIProvider (OpenAI-compatible)."""
        with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}):
            provider, model_id = get_provider("groq/llama-3.1-70b")

        from alphaclaw.llm.openai_ import OpenAIProvider

        assert isinstance(provider, OpenAIProvider)
        assert model_id == "llama-3.1-70b"

    def test_provider_caching(self):
        """Same prefix reuses cached provider instance."""
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            p1, _ = get_provider("openai/gpt-4o")
            p2, _ = get_provider("openai/gpt-4o-mini")

        assert p1 is p2

    def test_uses_settings_default(self):
        """No argument → uses settings.model."""
        with patch("alphaclaw.llm.registry.settings") as mock_settings:
            mock_settings.model = "openai/gpt-4o"
            with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
                provider, model_id = get_provider()

        from alphaclaw.llm.openai_ import OpenAIProvider

        assert isinstance(provider, OpenAIProvider)
        assert model_id == "gpt-4o"


class TestLLMResult:
    def test_has_tool_calls_true(self):
        result = LLMResult(tool_calls=[ToolCall(id="1", name="fn", arguments="{}")])
        assert result.has_tool_calls is True

    def test_has_tool_calls_false(self):
        result = LLMResult(content="hello")
        assert result.has_tool_calls is False

    def test_tool_call_to_openai(self):
        tc = ToolCall(id="call_123", name="get_quote", arguments='{"ticker":"AAPL"}')
        openai_format = tc.to_openai()
        assert openai_format == {
            "id": "call_123",
            "type": "function",
            "function": {"name": "get_quote", "arguments": '{"ticker":"AAPL"}'},
        }
