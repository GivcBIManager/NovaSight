"""
Encryption Migration Tests
=============================

Verifies that old ciphertext from all three legacy encryption
formats can be correctly decrypted by the unified EncryptionService.

Legacy formats:
1. v1-prefixed (PBKDF2 + Fernet)  — services/encryption_service.py
2. Raw Fernet (key used directly)  — utils/encryption.py
3. Base64-wrapped Fernet with PBKDF2 using tenant_id as raw salt
   — services/credential_service.py

The unified service decrypts any of these and re-encrypts to v1 format.
"""

import base64
import os
import pytest

from cryptography.fernet import Fernet
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.platform.security.encryption import (
    EncryptionService,
    DecryptionError,
    migrate_ciphertext,
)


def _generate_key():
    return base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")


class TestV1FormatMigration:
    """Test decryption of v1-prefixed ciphertext (primary format)."""

    def test_v1_roundtrip(self):
        key = _generate_key()
        svc = EncryptionService(master_key=key)
        ct = svc.encrypt("my-password-123")
        assert ct.startswith("v1:")
        assert svc.decrypt(ct) == "my-password-123"

    def test_v1_tenant_scoped(self):
        key = _generate_key()
        svc = EncryptionService(master_key=key, tenant_id="t-001")
        ct = svc.encrypt("tenant-secret")
        assert svc.decrypt(ct) == "tenant-secret"

    def test_v1_migrate_is_noop(self):
        """Migrating v1 ciphertext just re-encrypts to v1."""
        key = _generate_key()
        svc = EncryptionService(master_key=key)
        original = svc.encrypt("data")
        migrated = migrate_ciphertext(original, master_key=key)
        assert migrated.startswith("v1:")
        assert svc.decrypt(migrated) == "data"


class TestRawFernetMigration:
    """
    Test decryption of raw-Fernet ciphertext (legacy utils/encryption.py).
    This format uses the master key directly as a Fernet key — no KDF.
    """

    def test_raw_fernet_decrypted(self):
        # Generate a proper Fernet key (32 bytes → url-safe b64 → 44 chars)
        raw_key = Fernet.generate_key()
        fernet = Fernet(raw_key)
        legacy_ct = fernet.encrypt(b"legacy-password").decode("utf-8")

        # Unified service should auto-detect and decrypt
        svc = EncryptionService(master_key=raw_key.decode("utf-8"))
        pt = svc.decrypt(legacy_ct)
        assert pt == "legacy-password"

    def test_raw_fernet_migrated_to_v1(self):
        raw_key = Fernet.generate_key()
        fernet = Fernet(raw_key)
        legacy_ct = fernet.encrypt(b"old-secret").decode("utf-8")

        migrated = migrate_ciphertext(legacy_ct, master_key=raw_key.decode("utf-8"))
        assert migrated.startswith("v1:")

        svc = EncryptionService(master_key=raw_key.decode("utf-8"))
        assert svc.decrypt(migrated) == "old-secret"


class TestCredentialServiceMigration:
    """
    Test decryption of credential-service format (legacy credential_service.py).
    This format uses PBKDF2 with tenant_id.encode() as raw salt,
    then base64-wraps the Fernet ciphertext.
    """

    def _encrypt_credential_format(
        self, master_key: str, tenant_id: str, plaintext: str
    ) -> str:
        """Reproduce the legacy credential_service.py encryption."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=tenant_id.encode(),  # raw tenant_id as salt
            iterations=100_000,
            backend=default_backend(),
        )
        derived = kdf.derive(master_key.encode())
        fernet = Fernet(base64.urlsafe_b64encode(derived))
        ct = fernet.encrypt(plaintext.encode("utf-8"))
        # Base64-wrap the ciphertext
        return base64.urlsafe_b64encode(ct).decode("utf-8")

    def test_credential_format_decrypted(self):
        key = _generate_key()
        tenant_id = "test-tenant-123"
        legacy_ct = self._encrypt_credential_format(key, tenant_id, "db-password")

        svc = EncryptionService(master_key=key, tenant_id=tenant_id)
        pt = svc.decrypt(legacy_ct)
        assert pt == "db-password"

    def test_credential_format_migrated_to_v1(self):
        key = _generate_key()
        tenant_id = "test-tenant-456"
        legacy_ct = self._encrypt_credential_format(key, tenant_id, "api-key-xyz")

        migrated = migrate_ciphertext(
            legacy_ct, master_key=key, tenant_id=tenant_id
        )
        assert migrated.startswith("v1:")

        svc = EncryptionService(master_key=key, tenant_id=tenant_id)
        assert svc.decrypt(migrated) == "api-key-xyz"


class TestMixedFormatDecryption:
    """Test that a single EncryptionService instance handles all formats."""

    def test_decrypts_multiple_formats_in_dict(self):
        key = Fernet.generate_key().decode("utf-8")
        tenant_id = "multi-tenant"

        # Prepare ciphertext in different formats
        svc = EncryptionService(master_key=key, tenant_id=tenant_id)

        # v1 format
        v1_ct = svc.encrypt("v1-secret")

        # Raw Fernet
        raw_fernet = Fernet(key.encode())
        raw_ct = raw_fernet.encrypt(b"raw-secret").decode("utf-8")

        data = {"field_v1": v1_ct, "field_raw": raw_ct}
        decrypted = svc.decrypt_dict(data, parse_json=False)

        assert decrypted["field_v1"] == "v1-secret"
        assert decrypted["field_raw"] == "raw-secret"


class TestEncryptionMigrationEdgeCases:
    """Edge cases for the migration path."""

    def test_empty_string_migrates_to_empty(self):
        key = _generate_key()
        assert migrate_ciphertext("", master_key=key) == ""

    def test_wrong_key_raises(self):
        svc = EncryptionService(master_key=_generate_key())
        ct = svc.encrypt("secret")
        svc2 = EncryptionService(master_key=_generate_key())
        with pytest.raises(DecryptionError):
            svc2.decrypt(ct)

    def test_is_encrypted_heuristic(self):
        svc = EncryptionService(master_key=_generate_key())
        ct = svc.encrypt("data")
        assert EncryptionService.is_encrypted(ct) is True
        assert EncryptionService.is_encrypted("plaintext") is False
