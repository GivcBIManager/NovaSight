"""
NovaSight Credential Manager
============================

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.security.credentials`` instead.
"""

# Re-export everything from the canonical location
from app.platform.security.credentials import (   # noqa: F401
    CredentialManager,
    CredentialVault,
    get_credential_manager,
)

