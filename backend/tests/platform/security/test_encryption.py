"""
Tests for app.platform.security.encryption
=============================================

Covers the unified EncryptionService (encrypt, decrypt multi-format),
KeyRotationService, and the migrate_ciphertext helper.
"""

import base64
import os
import pytest
from unittest.mock import patch, MagicMock

from app.platform.security.encryption import (
    EncryptionService,
    EncryptionError,
    DecryptionError,
    KeyNotConfiguredError,
    KeyRotationService,
    migrate_ciphertext,
    get_encryption_service,
)


# ── Helpers ─────────────────────────────────────────────────────────

def _generate_key() -> str:
    """Generate a valid Fernet-compatible key."""
    return base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")


MASTER_KEY = _generate_key()


# ── EncryptionService ───────────────────────────────────────────────

class TestEncryptionServiceInit:
    """Test EncryptionService construction and key resolution."""

    def test_init_with_explicit_key(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        assert svc.master_key == MASTER_KEY

    def test_init_from_env_var(self):
        with patch.dict(os.environ, {"ENCRYPTION_MASTER_KEY": MASTER_KEY}):
            svc = EncryptionService()
            assert svc.master_key == MASTER_KEY

    def test_init_from_credential_env_var(self):
        key = _generate_key()
        with patch.dict(os.environ, {"CREDENTIAL_ENCRYPTION_KEY": key}, clear=False):
            # Clear ENCRYPTION_MASTER_KEY to force fallback
            env = os.environ.copy()
            env.pop("ENCRYPTION_MASTER_KEY", None)
            with patch.dict(os.environ, env, clear=True):
                with patch.dict(os.environ, {"CREDENTIAL_ENCRYPTION_KEY": key}):
                    svc = EncryptionService()
                    assert svc.master_key == key

    def test_init_raises_without_key(self):
        with patch.dict(os.environ, {}, clear=True):
            # Patch flask.has_app_context to False so _resolve_master_key
            # doesn't fall back to debug auto-generation
            with patch("flask.has_app_context", return_value=False):
                with pytest.raises(KeyNotConfiguredError):
                    EncryptionService()

    def test_tenant_id_stored(self):
        svc = EncryptionService(master_key=MASTER_KEY, tenant_id="t1")
        assert svc.tenant_id == "t1"


class TestEncryptDecryptV1:
    """Test v1-format encrypt/decrypt (primary path)."""

    def test_encrypt_returns_v1_prefix(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        ct = svc.encrypt("hello world")
        assert ct.startswith("v1:")
        assert len(ct) > 10

    def test_roundtrip(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        ct = svc.encrypt("secret data")
        pt = svc.decrypt(ct)
        assert pt == "secret data"

    def test_encrypt_empty_returns_empty(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        assert svc.encrypt("") == ""

    def test_decrypt_empty_returns_empty(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        assert svc.decrypt("") == ""

    def test_different_keys_cannot_decrypt(self):
        svc1 = EncryptionService(master_key=MASTER_KEY)
        svc2 = EncryptionService(master_key=_generate_key())
        ct = svc1.encrypt("secret")
        with pytest.raises(DecryptionError):
            svc2.decrypt(ct)

    def test_tenant_scoped_encryption(self):
        """Same key + different tenant_id → different ciphertext."""
        svc_a = EncryptionService(master_key=MASTER_KEY, tenant_id="tenant-a")
        svc_b = EncryptionService(master_key=MASTER_KEY, tenant_id="tenant-b")
        ct_a = svc_a.encrypt("secret")
        ct_b = svc_b.encrypt("secret")
        # Ciphertexts should differ
        assert ct_a != ct_b
        # Each can decrypt its own
        assert svc_a.decrypt(ct_a) == "secret"
        assert svc_b.decrypt(ct_b) == "secret"
        # Cross-tenant decryption should fail
        with pytest.raises(DecryptionError):
            svc_b.decrypt(ct_a)


class TestDecryptLegacyFormats:
    """Test transparent decryption of legacy formats."""

    def test_raw_fernet_decryption(self):
        """Legacy utils/encryption.py format: raw Fernet without prefix."""
        from cryptography.fernet import Fernet

        key = Fernet.generate_key()
        fernet = Fernet(key)
        ct = fernet.encrypt(b"raw-secret").decode("utf-8")

        svc = EncryptionService(master_key=key.decode("utf-8"))
        pt = svc.decrypt(ct)
        assert pt == "raw-secret"

    def test_unrecognized_format_raises(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        with pytest.raises(DecryptionError, match="does not match any known format"):
            svc.decrypt("totally-random-garbage-text-that-is-not-encrypted")


class TestDictHelpers:
    """Test encrypt_dict / decrypt_dict."""

    def test_encrypt_dict_all_fields(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        data = {"password": "secret", "token": "abc123"}
        encrypted = svc.encrypt_dict(data)
        assert encrypted["password"].startswith("v1:")
        assert encrypted["token"].startswith("v1:")

    def test_encrypt_dict_selected_fields(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        data = {"password": "secret", "username": "alice"}
        encrypted = svc.encrypt_dict(data, fields=["password"])
        assert encrypted["password"].startswith("v1:")
        assert encrypted["username"] == "alice"

    def test_decrypt_dict_roundtrip(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        original = {"password": "secret", "api_key": "key123"}
        encrypted = svc.encrypt_dict(original)
        decrypted = svc.decrypt_dict(encrypted)
        assert decrypted["password"] == "secret"
        assert decrypted["api_key"] == "key123"

    def test_encrypt_dict_json_value(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        data = {"config": {"host": "localhost", "port": 5432}}
        encrypted = svc.encrypt_dict(data, fields=["config"])
        decrypted = svc.decrypt_dict(encrypted, fields=["config"])
        assert decrypted["config"] == {"host": "localhost", "port": 5432}

    def test_encrypt_dict_skips_none(self):
        svc = EncryptionService(master_key=MASTER_KEY)
        data = {"password": None, "token": "abc"}
        encrypted = svc.encrypt_dict(data)
        assert encrypted["password"] is None
        assert encrypted["token"].startswith("v1:")


class TestIsEncrypted:
    """Test the is_encrypted() heuristic."""

    def test_v1_prefix(self):
        assert EncryptionService.is_encrypted("v1:abc123") is True

    def test_fernet_prefix(self):
        assert EncryptionService.is_encrypted("gAAAABxyz") is True

    def test_plaintext(self):
        assert EncryptionService.is_encrypted("hello world") is False

    def test_empty(self):
        assert EncryptionService.is_encrypted("") is False


class TestGenerateKey:
    """Test key generation."""

    def test_generates_valid_base64(self):
        key = EncryptionService.generate_key()
        decoded = base64.urlsafe_b64decode(key)
        assert len(decoded) == 32

    def test_generates_unique_keys(self):
        k1 = EncryptionService.generate_key()
        k2 = EncryptionService.generate_key()
        assert k1 != k2


class TestValidateKeyStrength:
    """Test validate_key_strength()."""

    def test_valid_key(self):
        key = EncryptionService.generate_key()
        valid, msg = EncryptionService.validate_key_strength(key)
        assert valid is True
        assert msg == ""

    def test_empty_key(self):
        valid, msg = EncryptionService.validate_key_strength("")
        assert valid is False

    def test_short_key(self):
        valid, msg = EncryptionService.validate_key_strength("short")
        assert valid is False


# ── KeyRotationService ──────────────────────────────────────────────

class TestKeyRotationService:
    """Test key rotation between old and new keys."""

    def test_rotate_value(self):
        old_key = _generate_key()
        new_key = _generate_key()

        old_svc = EncryptionService(master_key=old_key)
        ct_old = old_svc.encrypt("secret-data")

        rotator = KeyRotationService(old_key, new_key)
        ct_new = rotator.rotate_value(ct_old)

        # New service should decrypt the rotated value
        new_svc = EncryptionService(master_key=new_key)
        assert new_svc.decrypt(ct_new) == "secret-data"

    def test_rotate_empty_returns_empty(self):
        rotator = KeyRotationService(_generate_key(), _generate_key())
        assert rotator.rotate_value("") == ""

    def test_rotate_dict_fields(self):
        old_key = _generate_key()
        new_key = _generate_key()

        old_svc = EncryptionService(master_key=old_key)
        data = {
            "password": old_svc.encrypt("pass123"),
            "api_key": old_svc.encrypt("key456"),
            "name": "plain-text",
        }

        rotator = KeyRotationService(old_key, new_key)
        rotated = rotator.rotate_dict_fields(data, ["password", "api_key"])

        new_svc = EncryptionService(master_key=new_key)
        assert new_svc.decrypt(rotated["password"]) == "pass123"
        assert new_svc.decrypt(rotated["api_key"]) == "key456"
        assert rotated["name"] == "plain-text"


# ── migrate_ciphertext ──────────────────────────────────────────────

class TestMigrateCiphertext:
    """Test migrate_ciphertext() helper."""

    def test_v1_to_v1_roundtrip(self):
        key = _generate_key()
        svc = EncryptionService(master_key=key)
        original_ct = svc.encrypt("original")
        migrated_ct = migrate_ciphertext(original_ct, master_key=key)
        assert migrated_ct.startswith("v1:")
        assert svc.decrypt(migrated_ct) == "original"

    def test_raw_fernet_to_v1(self):
        """Migrate raw Fernet (legacy) to v1 format."""
        from cryptography.fernet import Fernet

        key = Fernet.generate_key()
        fernet = Fernet(key)
        raw_ct = fernet.encrypt(b"legacy-data").decode("utf-8")

        migrated = migrate_ciphertext(raw_ct, master_key=key.decode("utf-8"))
        assert migrated.startswith("v1:")

        svc = EncryptionService(master_key=key.decode("utf-8"))
        assert svc.decrypt(migrated) == "legacy-data"


# ── Factory ─────────────────────────────────────────────────────────

class TestGetEncryptionService:
    """Test get_encryption_service() factory function."""

    def test_returns_service_with_tenant(self):
        with patch.dict(os.environ, {"ENCRYPTION_MASTER_KEY": MASTER_KEY}):
            svc = get_encryption_service(tenant_id="t1")
            assert isinstance(svc, EncryptionService)
            assert svc.tenant_id == "t1"

    def test_returns_service_without_tenant(self):
        with patch.dict(os.environ, {"ENCRYPTION_MASTER_KEY": MASTER_KEY}):
            svc = get_encryption_service()
            assert isinstance(svc, EncryptionService)
            assert svc.tenant_id is None
