"""
NovaSight Encryption Service
============================

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.security.encryption`` instead.
"""

# Re-export everything from the canonical location
from app.platform.security.encryption import (   # noqa: F401
    EncryptionError,
    DecryptionError,
    KeyNotConfiguredError,
    EncryptionService,
    KeyRotationService,
    get_encryption_service,
)

