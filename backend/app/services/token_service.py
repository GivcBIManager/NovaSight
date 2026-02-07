"""
NovaSight Token Blacklist Service
=================================

Redis-based token blacklist for logout functionality.

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.auth.token_service`` instead.
"""

# Re-export everything from the canonical location
from app.platform.auth.token_service import (   # noqa: F401
    TokenBlacklist,
    LoginAttemptTracker,
    token_blacklist,
    login_tracker,
)

