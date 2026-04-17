"""Async utilities for Flask routes."""

import asyncio
from functools import wraps


def async_route(f):
    """Decorator to run async route handlers in Flask sync context."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapper
