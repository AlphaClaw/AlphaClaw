"""Model string routing — parse prefix and lazy-load the correct provider."""

from __future__ import annotations

import importlib
import logging
from typing import TYPE_CHECKING

from alphaclaw.config import settings

if TYPE_CHECKING:
    from alphaclaw.llm.base import LLMProvider

log = logging.getLogger(__name__)

# Prefix → (module path relative to alphaclaw.llm, class name)
_PROVIDER_MAP: dict[str, tuple[str, str]] = {
    "openai": ("openai_", "OpenAIProvider"),
    "azure": ("openai_", "OpenAIProvider"),
    "groq": ("openai_", "OpenAIProvider"),
    "together": ("openai_", "OpenAIProvider"),
    "ollama": ("openai_", "OpenAIProvider"),
    "vllm": ("openai_", "OpenAIProvider"),
    "anthropic": ("anthropic_", "AnthropicProvider"),
    "gemini": ("google_", "GeminiProvider"),
    "google": ("google_", "GeminiProvider"),
    "mistral": ("mistral_", "MistralProvider"),
    "bedrock": ("bedrock_", "BedrockProvider"),
}

# SDK package names for install hints
_SDK_PACKAGES: dict[str, str] = {
    "openai_": "openai",
    "anthropic_": "anthropic",
    "google_": "google-genai",
    "mistral_": "mistralai",
    "bedrock_": "boto3",
}

# Cache instantiated providers by prefix
_cache: dict[str, LLMProvider] = {}


def parse_model_string(model: str) -> tuple[str, str]:
    """Parse 'prefix/model-name' → ('prefix', 'model-name').

    If no prefix, returns ('', model) which triggers LiteLLM fallback.
    """
    if "/" in model:
        prefix, _, model_id = model.partition("/")
        return prefix.lower(), model_id
    return "", model


def _load_provider(prefix: str) -> LLMProvider:
    """Lazy-import and instantiate the provider for a given prefix."""
    if prefix in _cache:
        return _cache[prefix]

    if prefix not in _PROVIDER_MAP:
        # Unknown prefix → LiteLLM fallback
        log.info("Unknown prefix '%s', falling back to LiteLLM", prefix)
        return _load_litellm()

    module_name, class_name = _PROVIDER_MAP[prefix]

    try:
        mod = importlib.import_module(f"alphaclaw.llm.{module_name}")
    except ImportError as exc:
        pkg = _SDK_PACKAGES.get(module_name, module_name)
        raise ImportError(
            f"Provider '{prefix}' requires the '{pkg}' package. "
            f"Install it with: uv add {pkg}"
        ) from exc

    cls = getattr(mod, class_name)
    instance = cls(prefix=prefix)
    _cache[prefix] = instance
    log.info("Loaded LLM provider: %s (%s)", class_name, prefix)
    return instance


def _load_litellm() -> LLMProvider:
    """Load the LiteLLM fallback provider."""
    if "_litellm" in _cache:
        return _cache["_litellm"]

    mod = importlib.import_module("alphaclaw.llm.litellm_")
    instance = mod.LiteLLMProvider()
    _cache["_litellm"] = instance
    log.info("Loaded LLM provider: LiteLLMProvider (fallback)")
    return instance


def get_provider(model: str | None = None) -> tuple[LLMProvider, str]:
    """Get the provider and model ID for the configured model string.

    Returns (provider_instance, model_id_without_prefix).
    For LiteLLM fallback, model_id is the full original string.
    """
    model = model or settings.model
    prefix, model_id = parse_model_string(model)

    if not prefix:
        # No prefix — pass full string to LiteLLM
        return _load_litellm(), model

    if prefix in _PROVIDER_MAP:
        return _load_provider(prefix), model_id

    # Unknown prefix — LiteLLM with full string
    return _load_litellm(), model


def clear_cache() -> None:
    """Clear the provider cache (useful for testing)."""
    _cache.clear()
