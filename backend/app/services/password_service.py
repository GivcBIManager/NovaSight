"""
NovaSight Password Service
==========================

Secure password hashing and validation using Argon2.

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.security.passwords`` instead.
"""

# Re-export everything from the canonical location
from app.platform.security.passwords import (   # noqa: F401
    PasswordService,
    password_service,
)

