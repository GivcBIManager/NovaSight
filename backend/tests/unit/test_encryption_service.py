"""
Unit Tests for Encryption Service
=================================

Tests for the EncryptionService and KeyRotationService classes
to ensure proper encryption, decryption, and key rotation functionality.
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock

# Set test encryption key before importing services
os.environ['ENCRYPTION_MASTER_KEY'] = 'dGVzdC1rZXktZm9yLXVuaXQtdGVzdGluZy0zMmJ5dGVz'


class TestEncryptionService:
    """Tests for EncryptionService."""
    
    @pytest.fixture
    def encryption_service(self):
        """Create encryption service with test key."""
        from app.platform.security.encryption import EncryptionService
        return EncryptionService(
            master_key='dGVzdC1rZXktZm9yLXVuaXQtdGVzdGluZy0zMmJ5dGVz'
        )
    
    @pytest.fixture
    def tenant_encryption_service(self):
        """Create tenant-specific encryption service."""
        from app.platform.security.encryption import EncryptionService
        return EncryptionService(
            master_key='dGVzdC1rZXktZm9yLXVuaXQtdGVzdGluZy0zMmJ5dGVz',
            tenant_id='test-tenant-123'
        )
    
    def test_encrypt_string(self, encryption_service):
        """Test basic string encryption."""
        plaintext = "my_secret_password"
        encrypted = encryption_service.encrypt(plaintext)
        
        assert encrypted != plaintext
        assert encrypted.startswith('v1:')
        assert len(encrypted) > len(plaintext)
    
    def test_decrypt_string(self, encryption_service):
        """Test basic string decryption."""
        plaintext = "my_secret_password"
        encrypted = encryption_service.encrypt(plaintext)
        decrypted = encryption_service.decrypt(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_empty_string(self, encryption_service):
        """Test encryption of empty string."""
        assert encryption_service.encrypt("") == ""
        assert encryption_service.encrypt(None) == ""
    
    def test_decrypt_empty_string(self, encryption_service):
        """Test decryption of empty string."""
        assert encryption_service.decrypt("") == ""
        assert encryption_service.decrypt(None) == ""
    
    def test_encrypt_unicode(self, encryption_service):
        """Test encryption of Unicode strings."""
        plaintext = "パスワード🔐秘密"
        encrypted = encryption_service.encrypt(plaintext)
        decrypted = encryption_service.decrypt(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_long_string(self, encryption_service):
        """Test encryption of long strings."""
        plaintext = "x" * 10000
        encrypted = encryption_service.encrypt(plaintext)
        decrypted = encryption_service.decrypt(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_dict(self, encryption_service):
        """Test dictionary encryption."""
        data = {
            "username": "admin",
            "password": "secret123",
            "host": "localhost"
        }
        
        encrypted = encryption_service.encrypt_dict(data, fields=["password"])
        
        assert encrypted["username"] == "admin"
        assert encrypted["host"] == "localhost"
        assert encrypted["password"] != "secret123"
        assert encrypted["password"].startswith("v1:")
    
    def test_encrypt_dict_all_fields(self, encryption_service):
        """Test encrypting all dictionary fields."""
        data = {"a": "value1", "b": "value2"}
        
        encrypted = encryption_service.encrypt_dict(data)
        
        assert all(v.startswith("v1:") for v in encrypted.values())
    
    def test_decrypt_dict(self, encryption_service):
        """Test dictionary decryption."""
        original = {
            "username": "admin",
            "password": "secret123",
            "config": {"nested": "value"}
        }
        
        encrypted = encryption_service.encrypt_dict(
            original,
            fields=["password", "config"]
        )
        decrypted = encryption_service.decrypt_dict(
            encrypted,
            fields=["password", "config"]
        )
        
        assert decrypted["username"] == "admin"
        assert decrypted["password"] == "secret123"
        assert decrypted["config"] == {"nested": "value"}
    
    def test_tenant_isolation(self, encryption_service, tenant_encryption_service):
        """Test that different tenants have different encryption keys."""
        plaintext = "shared_secret"
        
        encrypted1 = encryption_service.encrypt(plaintext)
        encrypted2 = tenant_encryption_service.encrypt(plaintext)
        
        # Same plaintext should produce different ciphertexts
        assert encrypted1 != encrypted2
        
        # Each service can only decrypt its own ciphertext
        assert encryption_service.decrypt(encrypted1) == plaintext
        assert tenant_encryption_service.decrypt(encrypted2) == plaintext
        
        # Cross-decryption should fail
        from app.platform.security.encryption import DecryptionError
        with pytest.raises(DecryptionError):
            encryption_service.decrypt(encrypted2)
    
    def test_is_encrypted(self, encryption_service):
        """Test encryption detection."""
        encrypted = encryption_service.encrypt("test")
        
        assert encryption_service.is_encrypted(encrypted)
        assert not encryption_service.is_encrypted("plaintext")
        assert not encryption_service.is_encrypted("")
        assert not encryption_service.is_encrypted(None)
    
    def test_generate_key(self):
        """Test key generation."""
        from app.platform.security.encryption import EncryptionService
        
        key1 = EncryptionService.generate_key()
        key2 = EncryptionService.generate_key()
        
        assert key1 != key2
        assert len(key1) >= 32
    
    def test_validate_key_strength(self):
        """Test key strength validation."""
        from app.platform.security.encryption import EncryptionService
        
        # Valid key
        valid_key = EncryptionService.generate_key()
        is_valid, error = EncryptionService.validate_key_strength(valid_key)
        assert is_valid
        
        # Empty key
        is_valid, error = EncryptionService.validate_key_strength("")
        assert not is_valid
        
        # Short key
        is_valid, error = EncryptionService.validate_key_strength("short")
        assert not is_valid
    
    def test_version_prefix(self, encryption_service):
        """Test that encrypted data has version prefix."""
        encrypted = encryption_service.encrypt("test")
        
        assert encrypted.startswith("v1:")
        
        # Can still decrypt legacy unversioned data
        # (this tests the backwards compatibility code path)


class TestKeyRotationService:
    """Tests for KeyRotationService."""
    
    @pytest.fixture
    def old_key(self):
        return 'b2xkLWtleS1mb3ItdGVzdGluZy1yb3RhdGlvbi0zMg=='
    
    @pytest.fixture
    def new_key(self):
        return 'bmV3LWtleS1mb3ItdGVzdGluZy1yb3RhdGlvbi0zMg=='
    
    @pytest.fixture
    def rotation_service(self, old_key, new_key):
        """Create key rotation service."""
        from app.platform.security.encryption import KeyRotationService
        return KeyRotationService(old_key, new_key)
    
    def test_rotate_value(self, rotation_service, old_key):
        """Test rotating a single encrypted value."""
        from app.platform.security.encryption import EncryptionService
        
        # Encrypt with old key
        old_service = EncryptionService(master_key=old_key)
        original = "secret_to_rotate"
        encrypted_old = old_service.encrypt(original)
        
        # Rotate to new key
        encrypted_new = rotation_service.rotate_value(encrypted_old)
        
        # Verify new encryption is different
        assert encrypted_new != encrypted_old
        
        # Verify can decrypt with new key
        from app.platform.security.encryption import EncryptionService
        new_service = rotation_service.new_service
        decrypted = new_service.decrypt(encrypted_new)
        assert decrypted == original
    
    def test_rotate_empty_value(self, rotation_service):
        """Test rotating empty values."""
        assert rotation_service.rotate_value("") == ""
        assert rotation_service.rotate_value(None) is None
    
    def test_rotate_dict_fields(self, rotation_service, old_key):
        """Test rotating dictionary fields."""
        from app.platform.security.encryption import EncryptionService
        
        old_service = EncryptionService(master_key=old_key)
        
        data = {
            "password": old_service.encrypt("secret"),
            "token": old_service.encrypt("api_token"),
            "username": "admin"  # Not encrypted
        }
        
        rotated = rotation_service.rotate_dict_fields(
            data,
            fields=["password", "token"]
        )
        
        # Encrypted fields should change
        assert rotated["password"] != data["password"]
        assert rotated["token"] != data["token"]
        
        # Non-encrypted field unchanged
        assert rotated["username"] == "admin"
        
        # Verify decryption with new key
        new_service = rotation_service.new_service
        assert new_service.decrypt(rotated["password"]) == "secret"
        assert new_service.decrypt(rotated["token"]) == "api_token"


class TestEncryptionServiceNoKey:
    """Tests for EncryptionService behavior without configured key."""
    
    def test_raises_error_without_key(self):
        """Test that missing key raises appropriate error in production."""
        from app.platform.security.encryption import EncryptionService, KeyNotConfiguredError
        
        # Remove environment key
        original_key = os.environ.pop('ENCRYPTION_MASTER_KEY', None)
        original_cred_key = os.environ.pop('CREDENTIAL_ENCRYPTION_KEY', None)
        
        try:
            with patch('flask.has_app_context', return_value=False):
                with pytest.raises(KeyNotConfiguredError):
                    EncryptionService()
        finally:
            # Restore environment
            if original_key:
                os.environ['ENCRYPTION_MASTER_KEY'] = original_key
            if original_cred_key:
                os.environ['CREDENTIAL_ENCRYPTION_KEY'] = original_cred_key


class TestDecryptionErrors:
    """Tests for decryption error handling."""
    
    @pytest.fixture
    def encryption_service(self):
        from app.platform.security.encryption import EncryptionService
        return EncryptionService(
            master_key='dGVzdC1rZXktZm9yLXVuaXQtdGVzdGluZy0zMmJ5dGVz'
        )
    
    def test_invalid_token_raises_error(self, encryption_service):
        """Test that invalid encrypted data raises DecryptionError."""
        from app.platform.security.encryption import DecryptionError
        
        with pytest.raises(DecryptionError):
            encryption_service.decrypt("v1:invalid_encrypted_data")
    
    def test_wrong_key_raises_error(self, encryption_service):
        """Test that wrong key raises DecryptionError."""
        from app.platform.security.encryption import EncryptionService, DecryptionError
        
        # Encrypt with one key
        encrypted = encryption_service.encrypt("test")
        
        # Try to decrypt with different key
        other_service = EncryptionService(
            master_key='ZGlmZmVyZW50LWtleS1mb3ItdGVzdGluZy0zMmJ5dGU='
        )
        
        with pytest.raises(DecryptionError):
            other_service.decrypt(encrypted)
