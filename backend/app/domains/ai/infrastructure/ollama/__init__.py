"""
NovaSight Ollama Integration
=============================

Local LLM integration for natural language processing.
Implements ADR-002: No arbitrary code generation - LLM only generates
validated parameters for templates.
"""

from app.domains.ai.infrastructure.ollama.client import OllamaClient, OllamaError, OllamaConnectionError
from app.domains.ai.infrastructure.ollama.json_utils import extract_json_from_response
from app.domains.ai.infrastructure.ollama.nl_to_params import NLToParametersService, QueryIntent
from app.domains.ai.infrastructure.ollama.prompt_templates import PromptTemplates
from app.domains.ai.infrastructure.ollama.query_classifier import (
    QueryClassifier,
    QueryType,
    ClassifiedIntent,
    QueryEntities,
    TimeRange,
)

__all__ = [
    # Client
    'OllamaClient',
    'OllamaError',
    'OllamaConnectionError',
    # JSON utilities
    'extract_json_from_response',
    # NL-to-Parameters
    'NLToParametersService',
    'QueryIntent',
    'PromptTemplates',
    # Query Classifier
    'QueryClassifier',
    'QueryType',
    'ClassifiedIntent',
    'QueryEntities',
    'TimeRange',
]
