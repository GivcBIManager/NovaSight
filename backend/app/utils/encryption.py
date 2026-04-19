"""
Backward-compatibility shim.
Import from ``app.platform.security.encryption`` instead.
"""

from app.platform.security.encryption import (   # noqa: F401
    EncryptionService,
    KeyRotationService,
    EncryptionError,
    DecryptionError,
    KeyNotConfiguredError,
    get_encryption_service,
)

from app.utils.encrypted_types import (   # noqa: F401
    EncryptedString,
    EncryptedJSON,
    EncryptedText,
)

