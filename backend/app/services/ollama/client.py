"""
NovaSight Ollama Client
========================

Async client for interacting with Ollama API.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.ai.infrastructure.ollama.client` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.ollama.client is deprecated. "
    "Use app.domains.ai.infrastructure.ollama.client instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.infrastructure.ollama.client import (  # noqa: F401, E402
    OllamaError,
    OllamaConnectionError,
    OllamaGenerationError,
    OllamaClient,
    get_ollama_client,
)

__all__ = [
    "OllamaError",
    "OllamaConnectionError",
    "OllamaGenerationError",
    "OllamaClient",
    "get_ollama_client",
]
