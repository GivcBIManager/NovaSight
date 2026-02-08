"""
Ollama JSON Utilities
=====================

Shared JSON extraction helpers for parsing LLM responses.
"""

import json
import re
from typing import Any, Dict, Union


def extract_json_from_response(response: str) -> Union[Dict[str, Any], list]:
    """
    Extract JSON from an LLM response.

    Handles several common LLM output patterns:
      1. Raw JSON string
      2. JSON wrapped in markdown code blocks (```json ... ```)
      3. JSON object embedded in surrounding prose
      4. JSON array embedded in surrounding prose

    Args:
        response: Raw text response from the LLM.

    Returns:
        Parsed JSON as a dict or list.

    Raises:
        json.JSONDecodeError: If no valid JSON can be found.
    """
    # 1. Try direct parse
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # 2. Try markdown code block extraction
    code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Try to find a JSON object
    start = response.find('{')
    end = response.rfind('}') + 1
    if start >= 0 and end > start:
        try:
            return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass

    # 4. Try to find a JSON array
    start = response.find('[')
    end = response.rfind(']') + 1
    if start >= 0 and end > start:
        try:
            return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("No valid JSON found in response", response, 0)
