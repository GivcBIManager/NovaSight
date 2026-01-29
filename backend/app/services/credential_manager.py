"""
NovaSight Credential Manager
============================

Secure credential management service for handling sensitive data
like database passwords, API keys, and tokens. Provides automatic
detection and encryption of sensitive fields.

Security Features:
- Automatic detection of sensitive fields by name
- Encryption using EncryptionService (AES-256)
- Credential masking for safe logging/display
- Tenant-isolated credential storage
- Support for various credential types

Usage:
    manager = CredentialManager(tenant_id="...")
    
    # Store credentials with auto-encryption
    encrypted = manager.store_credentials(
        datasource_id="...",
        credentials={"username": "admin", "password": "secret"}
    )
    
    # Retrieve with auto-decryption
    decrypted = manager.retrieve_credentials(encrypted)
    
    # Mask for display
    masked = manager.mask_credentials(credentials)
"""

import logging
from typing import Any, Dict, List, Optional, Set

from app.services.encryption_service import (
    EncryptionService,
    EncryptionError,
    DecryptionError
)

logger = logging.getLogger(__name__)


class CredentialManager:
    """
    Manages encrypted credentials for data sources and integrations.
    
    Automatically detects and encrypts sensitive fields based on
    field naming conventions, providing a consistent approach to
    credential security across the application.
    
    Attributes:
        SENSITIVE_FIELDS: Default list of field name patterns to encrypt.
        NEVER_LOG_FIELDS: Fields that should never appear in logs.
    """
    
    # Field name patterns that indicate sensitive data
    SENSITIVE_FIELDS: Set[str] = {
        'password',
        'secret',
        'api_key',
        'apikey',
        'api-key',
        'token',
        'access_token',
        'refresh_token',
        'private_key',
        'privatekey',
        'private-key',
        'secret_key',
        'secretkey',
        'secret-key',
        'auth',
        'authorization',
        'credential',
        'credentials',
        'passphrase',
        'pass_phrase',
        'key',
        'cert',
        'certificate',
        'ssh_key',
        'bearer',
        'oauth',
    }
    
    # Fields that should never appear in logs even masked
    NEVER_LOG_FIELDS: Set[str] = {
        'private_key',
        'privatekey',
        'ssh_key',
        'certificate',
    }
    
    def __init__(self, tenant_id: Optional[str] = None):
        """
        Initialize credential manager.
        
        Args:
            tenant_id: Tenant ID for tenant-specific encryption.
                      If not provided, attempts to get from Flask context.
        """
        self.tenant_id = tenant_id or self._get_tenant_id_from_context()
        self.encryption = EncryptionService(tenant_id=self.tenant_id)
    
    def _get_tenant_id_from_context(self) -> Optional[str]:
        """Get tenant ID from Flask request context."""
        try:
            from flask import g, has_request_context
            if has_request_context() and hasattr(g, 'tenant') and g.tenant:
                return str(g.tenant.id)
        except ImportError:
            pass
        return None
    
    def store_credentials(
        self,
        credentials: Dict[str, Any],
        datasource_id: Optional[str] = None,
        additional_sensitive_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Store credentials with sensitive fields encrypted.
        
        Args:
            credentials: Dictionary of credentials to store.
            datasource_id: Optional data source identifier for logging.
            additional_sensitive_fields: Extra field names to treat as sensitive.
        
        Returns:
            New dictionary with sensitive fields encrypted.
        
        Example:
            >>> manager.store_credentials({
            ...     "username": "admin",
            ...     "password": "secret123",
            ...     "host": "localhost"
            ... })
            {
                "username": "admin",
                "password": "v1:gAAAA...",
                "host": "localhost"
            }
        """
        encrypted = {}
        sensitive_fields = self._get_sensitive_fields(additional_sensitive_fields)
        
        for key, value in credentials.items():
            if value is None:
                encrypted[key] = None
            elif self._is_sensitive(key, sensitive_fields):
                try:
                    # Convert non-string values to string for encryption
                    str_value = str(value) if not isinstance(value, str) else value
                    encrypted[key] = self.encryption.encrypt(str_value)
                    
                    if datasource_id:
                        logger.debug(
                            f"Encrypted sensitive field '{key}' for datasource {datasource_id}"
                        )
                except EncryptionError as e:
                    logger.error(f"Failed to encrypt field '{key}': {e}")
                    raise
            else:
                encrypted[key] = value
        
        return encrypted
    
    def retrieve_credentials(
        self,
        encrypted_credentials: Dict[str, Any],
        additional_sensitive_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Retrieve and decrypt credentials.
        
        Args:
            encrypted_credentials: Dictionary with encrypted sensitive fields.
            additional_sensitive_fields: Extra field names that were encrypted.
        
        Returns:
            New dictionary with sensitive fields decrypted.
        """
        decrypted = {}
        sensitive_fields = self._get_sensitive_fields(additional_sensitive_fields)
        
        for key, value in encrypted_credentials.items():
            if value is None:
                decrypted[key] = None
            elif self._is_sensitive(key, sensitive_fields) and value:
                try:
                    decrypted[key] = self.encryption.decrypt(value)
                except DecryptionError:
                    # Value might not be encrypted (legacy data)
                    logger.warning(f"Could not decrypt field '{key}', using raw value")
                    decrypted[key] = value
            else:
                decrypted[key] = value
        
        return decrypted
    
    def mask_credentials(
        self,
        credentials: Dict[str, Any],
        mask_char: str = '*',
        visible_chars: int = 0,
        additional_sensitive_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Return credentials with sensitive values masked.
        
        Safe for logging, display in UI, or inclusion in error messages.
        
        Args:
            credentials: Dictionary of credentials to mask.
            mask_char: Character to use for masking.
            visible_chars: Number of characters to show at start/end.
            additional_sensitive_fields: Extra field names to mask.
        
        Returns:
            New dictionary with sensitive values masked.
        
        Example:
            >>> manager.mask_credentials({
            ...     "username": "admin",
            ...     "password": "secret123"
            ... })
            {"username": "admin", "password": "********"}
        """
        masked = {}
        sensitive_fields = self._get_sensitive_fields(additional_sensitive_fields)
        
        for key, value in credentials.items():
            if self._is_sensitive(key, sensitive_fields):
                if key.lower() in self.NEVER_LOG_FIELDS:
                    masked[key] = '[REDACTED]'
                elif value:
                    if visible_chars > 0 and len(str(value)) > visible_chars * 2:
                        val_str = str(value)
                        masked[key] = (
                            val_str[:visible_chars] +
                            mask_char * 4 +
                            val_str[-visible_chars:]
                        )
                    else:
                        masked[key] = mask_char * 8
                else:
                    masked[key] = ''
            else:
                masked[key] = value
        
        return masked
    
    def _get_sensitive_fields(
        self,
        additional: Optional[List[str]] = None
    ) -> Set[str]:
        """Get complete set of sensitive field patterns."""
        fields = self.SENSITIVE_FIELDS.copy()
        if additional:
            fields.update(f.lower() for f in additional)
        return fields
    
    def _is_sensitive(self, field_name: str, sensitive_fields: Set[str]) -> bool:
        """
        Check if a field name indicates sensitive data.
        
        Uses substring matching to catch variations like
        'db_password', 'user_api_key', etc.
        
        Args:
            field_name: The field name to check.
            sensitive_fields: Set of sensitive field patterns.
        
        Returns:
            True if the field should be treated as sensitive.
        """
        field_lower = field_name.lower()
        
        # Direct match
        if field_lower in sensitive_fields:
            return True
        
        # Substring match for compound field names
        for sensitive in sensitive_fields:
            if sensitive in field_lower:
                return True
        
        return False
    
    def validate_credentials(
        self,
        credentials: Dict[str, Any],
        required_fields: List[str]
    ) -> tuple[bool, List[str]]:
        """
        Validate that required credential fields are present.
        
        Args:
            credentials: Dictionary of credentials to validate.
            required_fields: List of required field names.
        
        Returns:
            Tuple of (is_valid, missing_fields).
        """
        missing = []
        for field in required_fields:
            if field not in credentials or not credentials[field]:
                missing.append(field)
        
        return len(missing) == 0, missing
    
    def rotate_credentials(
        self,
        encrypted_credentials: Dict[str, Any],
        new_encryption_service: EncryptionService
    ) -> Dict[str, Any]:
        """
        Re-encrypt credentials with a new encryption service/key.
        
        Used during key rotation to migrate credentials to new keys.
        
        Args:
            encrypted_credentials: Currently encrypted credentials.
            new_encryption_service: New encryption service with new key.
        
        Returns:
            Credentials re-encrypted with new service.
        """
        # First decrypt with current service
        decrypted = self.retrieve_credentials(encrypted_credentials)
        
        # Create new manager with new service
        rotated = {}
        for key, value in decrypted.items():
            if value is None:
                rotated[key] = None
            elif self._is_sensitive(key, self.SENSITIVE_FIELDS):
                str_value = str(value) if not isinstance(value, str) else value
                rotated[key] = new_encryption_service.encrypt(str_value)
            else:
                rotated[key] = value
        
        return rotated


class CredentialVault:
    """
    Higher-level credential storage with versioning and audit support.
    
    Provides a vault-like interface for managing credentials with
    support for multiple versions and automatic rotation tracking.
    """
    
    def __init__(self, tenant_id: str):
        """
        Initialize credential vault.
        
        Args:
            tenant_id: Tenant ID for tenant-isolated storage.
        """
        self.tenant_id = tenant_id
        self.manager = CredentialManager(tenant_id)
    
    def store(
        self,
        resource_type: str,
        resource_id: str,
        credentials: Dict[str, Any],
        version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Store credentials for a resource.
        
        Args:
            resource_type: Type of resource (e.g., 'datasource', 'api').
            resource_id: Unique identifier for the resource.
            credentials: Credentials to store.
            version: Optional version identifier.
        
        Returns:
            Encrypted credentials with metadata.
        """
        import uuid
        from datetime import datetime
        
        encrypted = self.manager.store_credentials(
            credentials,
            datasource_id=resource_id
        )
        
        return {
            'id': str(uuid.uuid4()),
            'resource_type': resource_type,
            'resource_id': resource_id,
            'credentials': encrypted,
            'version': version or '1',
            'created_at': datetime.utcnow().isoformat(),
            'tenant_id': self.tenant_id
        }
    
    def retrieve(self, stored_credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retrieve and decrypt stored credentials.
        
        Args:
            stored_credentials: Stored credential object from store().
        
        Returns:
            Decrypted credentials.
        """
        return self.manager.retrieve_credentials(
            stored_credentials.get('credentials', {})
        )


def get_credential_manager(tenant_id: Optional[str] = None) -> CredentialManager:
    """
    Get a CredentialManager instance.
    
    Args:
        tenant_id: Optional tenant ID. Uses request context if not provided.
    
    Returns:
        Configured CredentialManager instance.
    """
    return CredentialManager(tenant_id)
