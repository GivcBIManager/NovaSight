"""
NovaSight Platform – Unified Encryption Service
=================================================

Merges the three legacy encryption implementations into a single,
canonical service:

1. ``services/encryption_service.py`` — v1-prefixed, PBKDF2+Fernet, static
   salt ``novasight_encryption_v1`` with optional ``:{tenant_id}`` suffix.
2. ``services/credential_service.py`` — base64-wrapped Fernet, PBKDF2 with
   ``tenant_id.encode()`` as raw salt.
3. ``utils/encryption.py`` — raw Fernet using config key directly (no KDF).

Design decisions
~~~~~~~~~~~~~~~~
* **Encrypt** always uses the *v1* path (PBKDF2 + version prefix).
* **Decrypt** auto-detects format:
  - Starts with ``v1:`` → v1 PBKDF2 path
  - Looks like Fernet token (starts with ``gAAAA``) → raw Fernet path
  - Otherwise → try v1 first, then raw Fernet, then credential-service
    base64-unwrap path.
* A ``migrate_ciphertext()`` helper re-encrypts from any legacy format to v1.

Canonical location — all other modules should import from here.
"""

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


# ─── Exceptions ────────────────────────────────────────────────────

class EncryptionError(Exception):
    """Base exception for encryption errors."""


class DecryptionError(EncryptionError):
    """Raised when decryption fails."""


class KeyNotConfiguredError(EncryptionError):
    """Raised when the master key is missing."""


# ─── Unified Encryption Service ────────────────────────────────────

class EncryptionService:
    """
    Unified AES-256 encryption using Fernet with PBKDF2 key derivation.

    Supports tenant-specific key derivation and transparent decryption
    of all three legacy ciphertext formats.
    """

    _SALT = b"novasight_encryption_v1"
    _PBKDF2_ITERATIONS = 100_000
    _KEY_LENGTH = 32
    _CURRENT_VERSION = "v1"

    def __init__(
        self,
        master_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ):
        self.master_key = self._resolve_master_key(master_key)
        self.tenant_id = tenant_id
        self._fernet_v1: Optional[Fernet] = None
        self._fernet_raw: Optional[Fernet] = None
        self._fernet_cred: Optional[Fernet] = None

    # ── key resolution ─────────────────────────────────────────────

    @staticmethod
    def _resolve_master_key(provided: Optional[str]) -> str:
        if provided:
            return provided

        key = (
            os.environ.get("ENCRYPTION_MASTER_KEY")
            or os.environ.get("CREDENTIAL_ENCRYPTION_KEY")
        )
        if key:
            return key

        from flask import current_app, has_app_context

        if has_app_context():
            key = (
                current_app.config.get("ENCRYPTION_MASTER_KEY")
                or current_app.config.get("CREDENTIAL_ENCRYPTION_KEY")
            )
            if not key and current_app.debug:
                logger.warning(
                    "Using auto-generated encryption key. "
                    "Set ENCRYPTION_MASTER_KEY in production!"
                )
                return EncryptionService.generate_key()
            if key:
                return key

        raise KeyNotConfiguredError(
            "Encryption master key not configured. "
            "Set ENCRYPTION_MASTER_KEY environment variable."
        )

    # ── Fernet factories ───────────────────────────────────────────

    @property
    def fernet(self) -> Fernet:
        """Primary (v1) Fernet instance — used for **all new encryptions**."""
        if self._fernet_v1 is None:
            self._fernet_v1 = self._make_fernet_v1()
        return self._fernet_v1

    def _make_fernet_v1(self) -> Fernet:
        """PBKDF2-derived Fernet using ``novasight_encryption_v1`` salt."""
        salt = (
            f"{self._SALT.decode()}:{self.tenant_id}".encode()
            if self.tenant_id
            else self._SALT
        )
        return self._derive_fernet(salt)

    def _make_fernet_raw(self) -> Fernet:
        """
        Raw Fernet using the master key directly (legacy ``utils/encryption.py``).
        The config key must already be a valid 32-byte url-safe-base64 value.
        """
        key = self.master_key
        if isinstance(key, str):
            key = key.encode()
        return Fernet(key)

    def _make_fernet_credential(self) -> Fernet:
        """
        PBKDF2-derived Fernet using raw ``tenant_id.encode()`` as salt
        (legacy ``credential_service.py``).
        """
        if not self.tenant_id:
            raise EncryptionError(
                "Cannot build credential-service Fernet without tenant_id"
            )
        return self._derive_fernet(self.tenant_id.encode())

    def _derive_fernet(self, salt: bytes) -> Fernet:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self._KEY_LENGTH,
            salt=salt,
            iterations=self._PBKDF2_ITERATIONS,
            backend=default_backend(),
        )
        derived = kdf.derive(self.master_key.encode())
        return Fernet(base64.urlsafe_b64encode(derived))

    # ── encrypt ────────────────────────────────────────────────────

    def encrypt(self, data: str) -> str:
        """Encrypt *data* and return ``v1:<ciphertext>``."""
        if not data:
            return ""
        try:
            ct = self.fernet.encrypt(data.encode("utf-8"))
            return f"{self._CURRENT_VERSION}:{ct.decode('utf-8')}"
        except Exception as e:
            logger.error("Encryption failed: %s", e)
            raise EncryptionError(f"Failed to encrypt data: {e}")

    # ── decrypt (multi-format) ─────────────────────────────────────

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt *encrypted_data*.

        Auto-detects the legacy format:
        * ``v1:…`` → PBKDF2 path
        * raw Fernet token → direct Fernet path
        * base64-wrapped Fernet token → credential-service path
        """
        if not encrypted_data:
            return ""

        # ── v1-prefixed (primary) ──────────────────────────────────
        if encrypted_data.startswith("v1:"):
            return self._decrypt_v1(encrypted_data[3:])

        # ── try v1 without prefix (legacy unversioned) ─────────────
        try:
            return self._decrypt_v1(encrypted_data)
        except (DecryptionError, Exception):
            pass

        # ── raw Fernet (utils/encryption.py legacy) ────────────────
        try:
            return self._decrypt_raw(encrypted_data)
        except Exception:
            pass

        # ── credential-service base64-wrapped format ───────────────
        if self.tenant_id:
            try:
                return self._decrypt_credential(encrypted_data)
            except Exception:
                pass

        raise DecryptionError(
            "Failed to decrypt: value does not match any known format"
        )

    def _decrypt_v1(self, ct: str) -> str:
        try:
            return self.fernet.decrypt(ct.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            raise DecryptionError("Invalid token or wrong key (v1)")
        except Exception as e:
            raise DecryptionError(f"v1 decrypt failed: {e}")

    def _decrypt_raw(self, ct: str) -> str:
        if self._fernet_raw is None:
            self._fernet_raw = self._make_fernet_raw()
        return self._fernet_raw.decrypt(ct.encode("utf-8")).decode("utf-8")

    def _decrypt_credential(self, ct: str) -> str:
        if self._fernet_cred is None:
            self._fernet_cred = self._make_fernet_credential()
        raw = base64.urlsafe_b64decode(ct.encode())
        return self._fernet_cred.decrypt(raw).decode("utf-8")

    # ── dict helpers ───────────────────────────────────────────────

    def encrypt_dict(
        self,
        data: Dict[str, Any],
        fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Encrypt selected *fields* (or all) in *data*."""
        result = data.copy()
        for field in fields or list(data.keys()):
            if field in result and result[field] is not None:
                val = result[field]
                if not isinstance(val, str):
                    val = json.dumps(val)
                result[field] = self.encrypt(val)
        return result

    def decrypt_dict(
        self,
        data: Dict[str, Any],
        fields: Optional[List[str]] = None,
        parse_json: bool = True,
    ) -> Dict[str, Any]:
        """Decrypt selected *fields* (or all) in *data*."""
        result = data.copy()
        for field in fields or list(data.keys()):
            if field in result and result[field] is not None:
                try:
                    decrypted = self.decrypt(result[field])
                    if parse_json:
                        try:
                            result[field] = json.loads(decrypted)
                        except json.JSONDecodeError:
                            result[field] = decrypted
                    else:
                        result[field] = decrypted
                except DecryptionError:
                    pass  # leave un-decryptable value as-is
        return result

    # ── inspection ─────────────────────────────────────────────────

    @staticmethod
    def is_encrypted(value: str) -> bool:
        """Heuristic: does *value* look like ciphertext?"""
        if not value:
            return False
        return value.startswith("v1:") or value.startswith("gAAAA")

    # ── key utilities ──────────────────────────────────────────────

    @staticmethod
    def generate_key() -> str:
        return base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")

    @staticmethod
    def validate_key_strength(
        key: str, min_length: int = 32
    ) -> Tuple[bool, str]:
        if not key:
            return False, "Key cannot be empty"
        try:
            decoded = base64.urlsafe_b64decode(key.encode())
            if len(decoded) < min_length:
                return False, f"Key must be at least {min_length} bytes when decoded"
        except Exception:
            if len(key) < min_length:
                return False, f"Key must be at least {min_length} characters"
        return True, ""


# ─── Key Rotation ──────────────────────────────────────────────────

class KeyRotationService:
    """Re-encrypt data from *old_key* to *new_key* without downtime."""

    def __init__(
        self,
        old_key: str,
        new_key: str,
        old_tenant_id: Optional[str] = None,
        new_tenant_id: Optional[str] = None,
    ):
        self.old_service = EncryptionService(old_key, old_tenant_id)
        self.new_service = EncryptionService(new_key, new_tenant_id or old_tenant_id)

    def rotate_value(self, encrypted_value: str) -> str:
        if not encrypted_value:
            return encrypted_value
        return self.new_service.encrypt(self.old_service.decrypt(encrypted_value))

    def rotate_table_column(
        self,
        model_class,
        column_name: str,
        batch_size: int = 100,
        tenant_id: Optional[str] = None,
    ) -> Tuple[int, int]:
        from app.extensions import db

        ok, err, offset = 0, 0, 0
        while True:
            query = model_class.query
            if tenant_id and hasattr(model_class, "tenant_id"):
                query = query.filter(model_class.tenant_id == tenant_id)
            rows = query.limit(batch_size).offset(offset).all()
            if not rows:
                break
            for row in rows:
                old = getattr(row, column_name, None)
                if old:
                    try:
                        setattr(row, column_name, self.rotate_value(old))
                        ok += 1
                    except Exception as e:
                        logger.error(
                            "Rotate %s.%s row %s: %s",
                            model_class.__name__, column_name,
                            getattr(row, "id", "?"), e,
                        )
                        err += 1
            db.session.commit()
            offset += batch_size
            logger.info("Rotated %d values, %d errors so far…", ok, err)
        return ok, err

    def rotate_dict_fields(
        self, data: Dict[str, Any], fields: List[str]
    ) -> Dict[str, Any]:
        result = data.copy()
        for f in fields:
            if f in result and result[f]:
                try:
                    result[f] = self.rotate_value(result[f])
                except Exception as e:
                    logger.error("Rotate field %s: %s", f, e)
        return result


# ─── Migration helper ──────────────────────────────────────────────

def migrate_ciphertext(
    ciphertext: str,
    master_key: str,
    tenant_id: Optional[str] = None,
) -> str:
    """
    Re-encrypt *ciphertext* (any legacy format) into the canonical v1 format.

    Useful for one-time data migrations.
    """
    svc = EncryptionService(master_key=master_key, tenant_id=tenant_id)
    plaintext = svc.decrypt(ciphertext)
    return svc.encrypt(plaintext)


# ─── Factory ───────────────────────────────────────────────────────

def get_encryption_service(tenant_id: Optional[str] = None) -> EncryptionService:
    """Return an ``EncryptionService`` bound to the optional *tenant_id*."""
    return EncryptionService(tenant_id=tenant_id)
