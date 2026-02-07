"""
NovaSight Encryption Utilities
==============================

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.security.encryption`` instead.
"""

# Re-export from the unified platform module
from app.platform.security.encryption import (   # noqa: F401
    EncryptionService,
    KeyRotationService,
    EncryptionError,
    DecryptionError,
    KeyNotConfiguredError,
    get_encryption_service,
)

# Re-export encrypted column types (they are still in utils/)
from app.utils.encrypted_types import (   # noqa: F401
    EncryptedString,
    EncryptedJSON,
    EncryptedText,
)

# ── Legacy function API (kept for backward compat) ─────────────────

from cryptography.fernet import Fernet
from flask import current_app
import logging

logger = logging.getLogger(__name__)


def get_encryption_key() -> bytes:
    """Get the encryption key from configuration."""
    key = current_app.config.get("CREDENTIAL_ENCRYPTION_KEY")
    if not key:
        if current_app.debug:
            key = Fernet.generate_key().decode()
            logger.warning("Using auto-generated encryption key.")
        else:
            raise ValueError("CREDENTIAL_ENCRYPTION_KEY must be set in production")
    if isinstance(key, str):
        key = key.encode()
    return key


def encrypt_credential(plaintext: str) -> str:
    if not plaintext:
        return ""
    f = Fernet(get_encryption_key())
    return f.encrypt(plaintext.encode()).decode()


def decrypt_credential(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    f = Fernet(get_encryption_key())
    return f.decrypt(ciphertext.encode()).decode()


def generate_encryption_key() -> str:
    return Fernet.generate_key().decode()


def rotate_encryption_key(old_key: str, new_key: str, ciphertext: str) -> str:
    pt = Fernet(old_key.encode()).decrypt(ciphertext.encode())
    return Fernet(new_key.encode()).encrypt(pt).decode()

