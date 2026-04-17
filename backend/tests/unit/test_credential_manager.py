"""
Unit Tests for Credential Manager
=================================

Tests for the CredentialManager and CredentialVault classes
to ensure proper credential handling, encryption, and masking.
"""

import os
import pytest
from unittest.mock import patch, MagicMock

# Set test encryption key before importing services
os.environ['ENCRYPTION_MASTER_KEY'] = 'dGVzdC1rZXktZm9yLXVuaXQtdGVzdGluZy0zMmJ5dGVz'


class TestCredentialManager:
    """Tests for CredentialManager."""
    
    @pytest.fixture
    def credential_manager(self):
        """Create credential manager with test tenant."""
        from app.platform.security.credentials import CredentialManager
        return CredentialManager(tenant_id='test-tenant-123')
    
    def test_store_credentials_encrypts_password(self, credential_manager):
        """Test that password fields are encrypted."""
        credentials = {
            "username": "admin",
            "password": "secret123",
            "host": "localhost"
        }
        
        stored = credential_manager.store_credentials(credentials)
        
        assert stored["username"] == "admin"
        assert stored["host"] == "localhost"
        assert stored["password"] != "secret123"
        assert stored["password"].startswith("v1:")
    
    def test_store_credentials_encrypts_api_key(self, credential_manager):
        """Test that API key fields are encrypted."""
        credentials = {
            "api_key": "sk-12345",
            "endpoint": "https://api.example.com"
        }
        
        stored = credential_manager.store_credentials(credentials)
        
        assert stored["endpoint"] == "https://api.example.com"
        assert stored["api_key"] != "sk-12345"
        assert stored["api_key"].startswith("v1:")
    
    def test_store_credentials_encrypts_token(self, credential_manager):
        """Test that token fields are encrypted."""
        credentials = {
            "access_token": "token123",
            "refresh_token": "refresh456",
            "user_id": "user-1"
        }
        
        stored = credential_manager.store_credentials(credentials)
        
        assert stored["user_id"] == "user-1"
        assert stored["access_token"].startswith("v1:")
        assert stored["refresh_token"].startswith("v1:")
    
    def test_store_credentials_compound_field_names(self, credential_manager):
        """Test encryption of compound sensitive field names."""
        credentials = {
            "db_password": "dbsecret",
            "user_api_key": "userkey",
            "auth_token": "authtoken",
            "connection_string": "postgres://..."
        }
        
        stored = credential_manager.store_credentials(credentials)
        
        # Compound names with sensitive keywords should be encrypted
        assert stored["db_password"].startswith("v1:")
        assert stored["user_api_key"].startswith("v1:")
        assert stored["auth_token"].startswith("v1:")
        
        # Non-sensitive field unchanged
        assert stored["connection_string"] == "postgres://..."
    
    def test_retrieve_credentials_decrypts(self, credential_manager):
        """Test that credentials are properly decrypted."""
        original = {
            "username": "admin",
            "password": "secret123",
            "api_key": "key456"
        }
        
        stored = credential_manager.store_credentials(original)
        retrieved = credential_manager.retrieve_credentials(stored)
        
        assert retrieved["username"] == "admin"
        assert retrieved["password"] == "secret123"
        assert retrieved["api_key"] == "key456"
    
    def test_retrieve_credentials_handles_none(self, credential_manager):
        """Test that None values are handled correctly."""
        credentials = {
            "username": "admin",
            "password": None,
            "optional_token": None
        }
        
        stored = credential_manager.store_credentials(credentials)
        retrieved = credential_manager.retrieve_credentials(stored)
        
        assert retrieved["username"] == "admin"
        assert retrieved["password"] is None
        assert retrieved["optional_token"] is None
    
    def test_mask_credentials_basic(self, credential_manager):
        """Test basic credential masking."""
        credentials = {
            "username": "admin",
            "password": "secret123",
            "host": "localhost"
        }
        
        masked = credential_manager.mask_credentials(credentials)
        
        assert masked["username"] == "admin"
        assert masked["host"] == "localhost"
        assert masked["password"] == "********"
    
    def test_mask_credentials_with_visible_chars(self, credential_manager):
        """Test credential masking with visible characters."""
        credentials = {
            "api_key": "sk-1234567890abcdef"
        }
        
        masked = credential_manager.mask_credentials(
            credentials,
            visible_chars=4
        )
        
        assert masked["api_key"].startswith("sk-1")
        assert "****" in masked["api_key"]
        assert masked["api_key"].endswith("cdef")
    
    def test_mask_credentials_redacts_private_keys(self, credential_manager):
        """Test that private keys are fully redacted."""
        credentials = {
            "private_key": "-----BEGIN RSA PRIVATE KEY-----...",
            "ssh_key": "ssh-rsa AAAA..."
        }
        
        masked = credential_manager.mask_credentials(credentials)
        
        assert masked["private_key"] == "[REDACTED]"
        assert masked["ssh_key"] == "[REDACTED]"
    
    def test_additional_sensitive_fields(self, credential_manager):
        """Test adding custom sensitive field names."""
        credentials = {
            "custom_secret": "value1",
            "my_special_key": "value2",
            "normal_field": "value3"
        }
        
        stored = credential_manager.store_credentials(
            credentials,
            additional_sensitive_fields=["custom_secret", "my_special_key"]
        )
        
        assert stored["custom_secret"].startswith("v1:")
        assert stored["my_special_key"].startswith("v1:")
        assert stored["normal_field"] == "value3"
    
    def test_validate_credentials_success(self, credential_manager):
        """Test credential validation with all required fields."""
        credentials = {
            "username": "admin",
            "password": "secret",
            "host": "localhost"
        }
        
        is_valid, missing = credential_manager.validate_credentials(
            credentials,
            required_fields=["username", "password"]
        )
        
        assert is_valid
        assert missing == []
    
    def test_validate_credentials_missing_fields(self, credential_manager):
        """Test credential validation with missing fields."""
        credentials = {
            "username": "admin"
        }
        
        is_valid, missing = credential_manager.validate_credentials(
            credentials,
            required_fields=["username", "password", "host"]
        )
        
        assert not is_valid
        assert "password" in missing
        assert "host" in missing
    
    def test_validate_credentials_empty_fields(self, credential_manager):
        """Test credential validation with empty fields."""
        credentials = {
            "username": "admin",
            "password": "",
            "host": None
        }
        
        is_valid, missing = credential_manager.validate_credentials(
            credentials,
            required_fields=["username", "password", "host"]
        )
        
        assert not is_valid
        assert "password" in missing
        assert "host" in missing
    
    def test_sensitive_field_patterns(self, credential_manager):
        """Test all sensitive field patterns are detected."""
        sensitive_names = [
            "password", "secret", "api_key", "apikey", "token",
            "access_token", "refresh_token", "private_key",
            "secret_key", "auth", "credential", "passphrase"
        ]
        
        for name in sensitive_names:
            credentials = {name: "test_value"}
            stored = credential_manager.store_credentials(credentials)
            assert stored[name].startswith("v1:"), f"Field '{name}' should be encrypted"
    
    def test_rotate_credentials(self, credential_manager):
        """Test credential rotation with new encryption service."""
        from app.platform.security.encryption import EncryptionService
        
        original = {
            "username": "admin",
            "password": "secret123"
        }
        
        # Store with current service
        stored = credential_manager.store_credentials(original)
        
        # Create new encryption service with different key
        new_service = EncryptionService(
            master_key='bmV3LWtleS1mb3ItdGVzdGluZy1yb3RhdGlvbi0zMg==',
            tenant_id='test-tenant-123'
        )
        
        # Rotate credentials
        rotated = credential_manager.rotate_credentials(stored, new_service)
        
        # Verify password was re-encrypted
        assert rotated["password"] != stored["password"]
        assert rotated["password"].startswith("v1:")
        
        # Verify can decrypt with new service
        decrypted = new_service.decrypt(rotated["password"])
        assert decrypted == "secret123"


class TestCredentialVault:
    """Tests for CredentialVault."""
    
    @pytest.fixture
    def vault(self):
        """Create credential vault."""
        from app.platform.security.credentials import CredentialVault
        return CredentialVault(tenant_id='test-tenant-123')
    
    def test_store_creates_metadata(self, vault):
        """Test that store creates proper metadata."""
        credentials = {
            "username": "admin",
            "password": "secret"
        }
        
        stored = vault.store(
            resource_type="datasource",
            resource_id="ds-123",
            credentials=credentials
        )
        
        assert "id" in stored
        assert stored["resource_type"] == "datasource"
        assert stored["resource_id"] == "ds-123"
        assert stored["tenant_id"] == "test-tenant-123"
        assert "created_at" in stored
        assert "credentials" in stored
    
    def test_store_encrypts_sensitive_fields(self, vault):
        """Test that vault encrypts sensitive fields."""
        credentials = {
            "username": "admin",
            "password": "secret"
        }
        
        stored = vault.store(
            resource_type="api",
            resource_id="api-123",
            credentials=credentials
        )
        
        assert stored["credentials"]["password"].startswith("v1:")
        assert stored["credentials"]["username"] == "admin"
    
    def test_retrieve_decrypts(self, vault):
        """Test that retrieve decrypts credentials."""
        original = {
            "username": "admin",
            "password": "secret123"
        }
        
        stored = vault.store(
            resource_type="datasource",
            resource_id="ds-123",
            credentials=original
        )
        
        retrieved = vault.retrieve(stored)
        
        assert retrieved["username"] == "admin"
        assert retrieved["password"] == "secret123"
    
    def test_version_tracking(self, vault):
        """Test version tracking in stored credentials."""
        credentials = {"password": "secret"}
        
        stored_v1 = vault.store(
            resource_type="datasource",
            resource_id="ds-123",
            credentials=credentials,
            version="1"
        )
        
        stored_v2 = vault.store(
            resource_type="datasource",
            resource_id="ds-123",
            credentials={"password": "new_secret"},
            version="2"
        )
        
        assert stored_v1["version"] == "1"
        assert stored_v2["version"] == "2"


class TestCredentialManagerTenantIsolation:
    """Tests for tenant isolation in credential management."""
    
    def test_different_tenants_different_encryption(self):
        """Test that credentials from different tenants are encrypted differently."""
        from app.platform.security.credentials import CredentialManager
        
        manager1 = CredentialManager(tenant_id='tenant-1')
        manager2 = CredentialManager(tenant_id='tenant-2')
        
        credentials = {"password": "same_password"}
        
        stored1 = manager1.store_credentials(credentials)
        stored2 = manager2.store_credentials(credentials)
        
        # Same plaintext should produce different ciphertexts
        assert stored1["password"] != stored2["password"]
    
    def test_cross_tenant_decryption_fails(self):
        """Test that one tenant cannot decrypt another's credentials."""
        from app.platform.security.credentials import CredentialManager
        
        manager1 = CredentialManager(tenant_id='tenant-1')
        manager2 = CredentialManager(tenant_id='tenant-2')
        
        # Store with tenant 1
        stored = manager1.store_credentials({"password": "secret"})
        
        # Attempt retrieval with tenant 2 (should not decrypt properly)
        retrieved = manager2.retrieve_credentials(stored)
        
        # The password should not be decrypted (returns encrypted value on failure)
        assert retrieved["password"] != "secret"


class TestGetCredentialManager:
    """Tests for get_credential_manager factory function."""
    
    def test_creates_manager_with_tenant(self):
        """Test creating manager with explicit tenant."""
        from app.platform.security.credentials import get_credential_manager
        
        manager = get_credential_manager(tenant_id='test-tenant')
        
        assert manager.tenant_id == 'test-tenant'
    
    def test_creates_manager_without_context(self):
        """Test creating manager without Flask context."""
        from app.platform.security.credentials import get_credential_manager
        
        manager = get_credential_manager()
        
        # Should work, tenant_id will be None
        assert manager is not None
