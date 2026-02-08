"""
NovaSight Ollama Prompt Templates
==================================

Structured prompts for different NL processing tasks.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.ai.infrastructure.ollama.prompt_templates` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.ollama.prompt_templates is deprecated. "
    "Use app.domains.ai.infrastructure.ollama.prompt_templates instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.infrastructure.ollama.prompt_templates import (  # noqa: F401, E402
    PromptTemplates,
)

__all__ = [
    "PromptTemplates",
]
