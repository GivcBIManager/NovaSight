"""
NovaSight Encryption Service
============================

Comprehensive encryption service for sensitive data using industry-standard
cryptography (AES-256 via Fernet). Supports versioned encryption for key
rotation and provides both string and dictionary encryption capabilities.

Security Features:
- AES-256 encryption via Fernet (symmetric)
- PBKDF2 key derivation with 100,000 iterations
- Version prefix support for key rotation
- Tenant-isolated encryption keys
"""

import os
import base64
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Base exception for encryption errors."""
    pass


class DecryptionError(EncryptionError):
    """Exception raised when decryption fails."""
    pass


class KeyNotConfiguredError(EncryptionError):
    """Exception raised when encryption key is not configured."""
    pass


class EncryptionService:
    """
    Service for encrypting sensitive data using AES-256 (Fernet).
    
    Features:
    - Symmetric encryption using Fernet (AES-256-CBC with HMAC)
    - PBKDF2 key derivation for enhanced security
    - Version prefixing for future key rotation support
    - Dictionary encryption with selective field encryption
    
    Usage:
        service = EncryptionService()
        encrypted = service.encrypt("sensitive_data")
        decrypted = service.decrypt(encrypted)
    """
    
    # Static salt for PBKDF2 - safe since master key is already high-entropy
    _SALT = b'novasight_encryption_v1'
    _PBKDF2_ITERATIONS = 100000
    _KEY_LENGTH = 32
    _CURRENT_VERSION = 'v1'
    
    def __init__(self, master_key: Optional[str] = None, tenant_id: Optional[str] = None):
        """
        Initialize encryption service.
        
        Args:
            master_key: Base64-encoded master key. Falls back to ENCRYPTION_MASTER_KEY
                       or CREDENTIAL_ENCRYPTION_KEY environment variables.
            tenant_id: Optional tenant ID for tenant-specific key derivation.
                      When provided, derives a unique key per tenant.
        
        Raises:
            KeyNotConfiguredError: If no master key is configured in production.
        """
        self.master_key = self._get_master_key(master_key)
        self.tenant_id = tenant_id
        self._fernet: Optional[Fernet] = None
    
    def _get_master_key(self, provided_key: Optional[str]) -> str:
        """Get master key from parameter or environment."""
        if provided_key:
            return provided_key
        
        # Try multiple environment variable names for compatibility
        key = (
            os.environ.get('ENCRYPTION_MASTER_KEY') or
            os.environ.get('CREDENTIAL_ENCRYPTION_KEY')
        )
        
        if not key:
            # Check if we're in debug/development mode
            from flask import current_app, has_app_context
            
            if has_app_context():
                key = current_app.config.get('ENCRYPTION_MASTER_KEY') or \
                      current_app.config.get('CREDENTIAL_ENCRYPTION_KEY')
                
                if not key and current_app.debug:
                    # Generate ephemeral key for development only
                    logger.warning(
                        "Using auto-generated encryption key. "
                        "Set ENCRYPTION_MASTER_KEY in production!"
                    )
                    key = self.generate_key()
            
            if not key:
                raise KeyNotConfiguredError(
                    "Encryption master key not configured. "
                    "Set ENCRYPTION_MASTER_KEY environment variable."
                )
        
        return key
    
    @property
    def fernet(self) -> Fernet:
        """Get or create Fernet cipher instance."""
        if self._fernet is None:
            self._fernet = self._create_fernet()
        return self._fernet
    
    def _create_fernet(self) -> Fernet:
        """
        Create Fernet cipher from master key.
        
        Uses PBKDF2 to derive a key from the master key, optionally
        incorporating tenant ID for tenant-specific encryption.
        """
        # Use tenant-specific salt if tenant_id is provided
        if self.tenant_id:
            salt = f"{self._SALT.decode()}:{self.tenant_id}".encode()
        else:
            salt = self._SALT
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self._KEY_LENGTH,
            salt=salt,
            iterations=self._PBKDF2_ITERATIONS,
            backend=default_backend()
        )
        
        # Derive encryption key from master key
        derived_key = kdf.derive(self.master_key.encode())
        fernet_key = base64.urlsafe_b64encode(derived_key)
        
        return Fernet(fernet_key)
    
    def encrypt(self, data: str) -> str:
        """
        Encrypt a string value.
        
        Args:
            data: The plaintext string to encrypt.
        
        Returns:
            Base64-encoded encrypted data with version prefix (e.g., "v1:...").
        
        Raises:
            EncryptionError: If encryption fails.
        """
        if not data:
            return ""
        
        try:
            encrypted = self.fernet.encrypt(data.encode('utf-8'))
            # Add version prefix for future key rotation support
            return f"{self._CURRENT_VERSION}:{encrypted.decode('utf-8')}"
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt data: {e}")
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt an encrypted string.
        
        Handles versioned encrypted data for key rotation. Supports:
        - v1: Current Fernet encryption format
        - Unversioned: Legacy format (pre-versioning)
        
        Args:
            encrypted_data: The encrypted string (with or without version prefix).
        
        Returns:
            The decrypted plaintext string.
        
        Raises:
            DecryptionError: If decryption fails.
        """
        if not encrypted_data:
            return ""
        
        try:
            # Handle versioned format
            if encrypted_data.startswith('v1:'):
                data = encrypted_data[3:]
            else:
                # Legacy unversioned format
                data = encrypted_data
            
            decrypted = self.fernet.decrypt(data.encode('utf-8'))
            return decrypted.decode('utf-8')
        
        except InvalidToken:
            logger.error("Decryption failed: Invalid token or wrong key")
            raise DecryptionError("Failed to decrypt: Invalid token or wrong key")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise DecryptionError(f"Failed to decrypt data: {e}")
    
    def encrypt_dict(
        self,
        data: Dict[str, Any],
        fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Encrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary containing values to encrypt.
            fields: List of field names to encrypt. If None, encrypts all fields.
        
        Returns:
            New dictionary with specified fields encrypted.
        
        Example:
            >>> service.encrypt_dict(
            ...     {"username": "admin", "password": "secret"},
            ...     fields=["password"]
            ... )
            {"username": "admin", "password": "v1:gAAAA..."}
        """
        result = data.copy()
        fields_to_encrypt = fields or list(data.keys())
        
        for field in fields_to_encrypt:
            if field in result and result[field] is not None:
                value = result[field]
                # Convert non-string values to JSON
                if not isinstance(value, str):
                    value = json.dumps(value)
                result[field] = self.encrypt(value)
        
        return result
    
    def decrypt_dict(
        self,
        data: Dict[str, Any],
        fields: Optional[List[str]] = None,
        parse_json: bool = True
    ) -> Dict[str, Any]:
        """
        Decrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary containing encrypted values.
            fields: List of field names to decrypt. If None, attempts all fields.
            parse_json: If True, attempts to parse decrypted values as JSON.
        
        Returns:
            New dictionary with specified fields decrypted.
        """
        result = data.copy()
        fields_to_decrypt = fields or list(data.keys())
        
        for field in fields_to_decrypt:
            if field in result and result[field] is not None:
                try:
                    decrypted = self.decrypt(result[field])
                    
                    # Attempt JSON parsing if enabled
                    if parse_json:
                        try:
                            result[field] = json.loads(decrypted)
                        except json.JSONDecodeError:
                            result[field] = decrypted
                    else:
                        result[field] = decrypted
                        
                except DecryptionError:
                    # Field might not be encrypted, leave as-is
                    pass
        
        return result
    
    def is_encrypted(self, value: str) -> bool:
        """
        Check if a value appears to be encrypted.
        
        Args:
            value: The string to check.
        
        Returns:
            True if the value appears to be encrypted (has version prefix).
        """
        if not value:
            return False
        return value.startswith('v1:')
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new cryptographically secure master key.
        
        Returns:
            A base64-encoded 32-byte random key suitable for use as master key.
        """
        return base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8')
    
    @staticmethod
    def validate_key_strength(key: str, min_length: int = 32) -> Tuple[bool, str]:
        """
        Validate that a master key meets security requirements.
        
        Args:
            key: The key to validate.
            min_length: Minimum required key length in bytes.
        
        Returns:
            Tuple of (is_valid, error_message).
        """
        if not key:
            return False, "Key cannot be empty"
        
        # Check decoded length
        try:
            decoded = base64.urlsafe_b64decode(key.encode())
            if len(decoded) < min_length:
                return False, f"Key must be at least {min_length} bytes when decoded"
        except Exception:
            # Not base64, check raw length
            if len(key) < min_length:
                return False, f"Key must be at least {min_length} characters"
        
        return True, ""


class KeyRotationService:
    """
    Service for rotating encryption keys without downtime.
    
    Handles re-encryption of data from an old key to a new key,
    supporting both individual values and batch database operations.
    
    Usage:
        rotation = KeyRotationService(old_key, new_key)
        new_encrypted = rotation.rotate_value(old_encrypted)
        count = rotation.rotate_table_column(DataConnection, 'password_encrypted')
    """
    
    def __init__(
        self,
        old_key: str,
        new_key: str,
        old_tenant_id: Optional[str] = None,
        new_tenant_id: Optional[str] = None
    ):
        """
        Initialize key rotation service.
        
        Args:
            old_key: The current/old master key.
            new_key: The new master key to rotate to.
            old_tenant_id: Tenant ID used with old key (if tenant-specific).
            new_tenant_id: Tenant ID for new key (defaults to old_tenant_id).
        """
        self.old_service = EncryptionService(old_key, old_tenant_id)
        self.new_service = EncryptionService(new_key, new_tenant_id or old_tenant_id)
    
    def rotate_value(self, encrypted_value: str) -> str:
        """
        Re-encrypt a single value with the new key.
        
        Args:
            encrypted_value: Value encrypted with the old key.
        
        Returns:
            Value re-encrypted with the new key.
        """
        if not encrypted_value:
            return encrypted_value
        
        decrypted = self.old_service.decrypt(encrypted_value)
        return self.new_service.encrypt(decrypted)
    
    def rotate_table_column(
        self,
        model_class,
        column_name: str,
        batch_size: int = 100,
        tenant_id: Optional[str] = None
    ) -> Tuple[int, int]:
        """
        Rotate encryption for all values in a database table column.
        
        Args:
            model_class: SQLAlchemy model class.
            column_name: Name of the encrypted column.
            batch_size: Number of rows to process per batch.
            tenant_id: Optional tenant ID to filter rows.
        
        Returns:
            Tuple of (success_count, error_count).
        """
        from app.extensions import db
        
        success_count = 0
        error_count = 0
        offset = 0
        
        while True:
            # Build query
            query = model_class.query
            if tenant_id and hasattr(model_class, 'tenant_id'):
                query = query.filter(model_class.tenant_id == tenant_id)
            
            rows = query.limit(batch_size).offset(offset).all()
            if not rows:
                break
            
            for row in rows:
                old_value = getattr(row, column_name, None)
                if old_value:
                    try:
                        new_value = self.rotate_value(old_value)
                        setattr(row, column_name, new_value)
                        success_count += 1
                    except Exception as e:
                        logger.error(
                            f"Failed to rotate {model_class.__name__}.{column_name} "
                            f"for row {getattr(row, 'id', 'unknown')}: {e}"
                        )
                        error_count += 1
            
            db.session.commit()
            offset += batch_size
            
            logger.info(f"Rotated {success_count} values, {error_count} errors so far...")
        
        return success_count, error_count
    
    def rotate_dict_fields(
        self,
        data: Dict[str, Any],
        fields: List[str]
    ) -> Dict[str, Any]:
        """
        Rotate encryption for specific fields in a dictionary.
        
        Args:
            data: Dictionary with encrypted fields.
            fields: List of field names to rotate.
        
        Returns:
            New dictionary with fields re-encrypted.
        """
        result = data.copy()
        
        for field in fields:
            if field in result and result[field]:
                try:
                    result[field] = self.rotate_value(result[field])
                except Exception as e:
                    logger.error(f"Failed to rotate field {field}: {e}")
        
        return result


# Convenience function for getting encryption service instance
def get_encryption_service(tenant_id: Optional[str] = None) -> EncryptionService:
    """
    Get an EncryptionService instance.
    
    Args:
        tenant_id: Optional tenant ID for tenant-specific encryption.
    
    Returns:
        Configured EncryptionService instance.
    """
    return EncryptionService(tenant_id=tenant_id)
