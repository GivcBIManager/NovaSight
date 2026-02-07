"""
NovaSight Credential Service
============================

Encryption and decryption of sensitive credentials.

.. deprecated::
    This module is a backward-compatibility shim.
    Use ``app.platform.security.encryption.EncryptionService`` instead.

    ``CredentialService`` is now a thin wrapper around the unified
    ``EncryptionService`` that preserves the original API surface.
"""

import warnings
from typing import Optional
from app.platform.security.encryption import EncryptionService as _Unified
import logging

logger = logging.getLogger(__name__)


class CredentialService:
    """
    Backward-compatible wrapper — delegates to the unified
    ``EncryptionService`` in ``app.platform.security.encryption``.
    """

    def __init__(self, tenant_id: str):
        warnings.warn(
            "CredentialService is deprecated. "
            "Use app.platform.security.encryption.EncryptionService instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        self._svc = _Unified(tenant_id=tenant_id)

    def encrypt(self, plaintext: str) -> str:
        return self._svc.encrypt(plaintext)

    def decrypt(self, ciphertext: str) -> str:
        return self._svc.decrypt(ciphertext)

